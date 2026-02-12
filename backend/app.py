# =========================================
# Backend API (Flask)
# - Works for local dev and Render deploy
# =========================================

import io
import os
import threading
from typing import Any

import h5py
import joblib
import numpy as np
import tensorflow as tf
from flask import Flask, jsonify, request
from flask_cors import CORS
from tensorflow.keras.preprocessing import image as keras_image

app = Flask(__name__)
CORS(app)

# === Paths ===
MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")

# === Load Models ===

# Heart model (.keras)
heart_model_path = os.path.join(MODELS_DIR, "model_heart_8f.keras")
try:
    heart_model = tf.keras.models.load_model(heart_model_path, compile=False)
    heart_load_error = None
except Exception as e:  # pragma: no cover
    heart_model = None
    heart_load_error = str(e)

# Diabetes not deployed yet
diabetes_model = None

# Optional scaler for heart model
scaler_path = os.path.join(MODELS_DIR, "scaler_baseline.pkl")
scaler = joblib.load(scaler_path) if os.path.exists(scaler_path) else None


# === Feature Schemas ===
DIABETES_FEATURES = [
    "HighChol",
    "BMI",
    "Smoker",
    "HeartDiseaseorAttack",
    "PhysActivity",
    "GenHlth",
    "PhysHlth",
    "DiffWalk",
    "Age",
]

HEART_FEATURES = ["age", "sex", "cp", "thalach", "ca", "oldpeak", "thal", "slope"]

STROKE_FEATURES = ["Age", "Hypertension", "HeartDisease", "AvgGlucoseLevel", "BMI"]


# === Helpers ===
def _to_prob(y: Any) -> float:
    return float(np.ravel(y)[0])


def _extract_ordered_features(data: dict, feature_list: list[str]) -> np.ndarray:
    vals = []
    for feature in feature_list:
        if feature not in data:
            raise ValueError(f"Missing feature: {feature}")
        vals.append(float(data[feature]))
    return np.array(vals).reshape(1, -1)


# === Melanoma (EfficientNetB0) ===
melanoma_model = None
melanoma_label_names: list[str] | None = None
melanoma_image_size = (160, 160)
melanoma_num_classes = 8
_melanoma_lock = threading.Lock()
_melanoma_tried = False
_melanoma_load_error: str | None = None

melanoma_model_path_keras = os.path.join(MODELS_DIR, "efficientnet_isic2019.keras")
melanoma_weights_path = os.path.join(MODELS_DIR, "efficientnet_isic2019.weights.h5")
melanoma_legacy_h5_path = os.path.join(MODELS_DIR, "efficientnet_isic2019.h5")
melanoma_metadata_path = os.path.join(MODELS_DIR, "model_metadata.joblib")


def _resolve_h5_layer_group(root_group, layer_name: str):
    if layer_name not in root_group:
        return None
    g = root_group[layer_name]
    if "sequential" in g and layer_name in g["sequential"]:
        return g["sequential"][layer_name]
    return g


def _load_weights_from_h5_group(layer, h5_group) -> bool:
    if h5_group is None:
        return False

    arrays: dict[str, np.ndarray] = {}
    for key in h5_group.keys():
        obj = h5_group[key]
        if isinstance(obj, h5py.Dataset):
            arrays[key] = obj[()]

    if not arrays:
        return False

    weights: list[np.ndarray] = []
    for var in layer.weights:
        suffix = var.name.split("/")[-1].split(":")[0]
        if suffix not in arrays:
            raise ValueError(f"Missing weight '{suffix}' for layer '{layer.name}'")
        weights.append(arrays[suffix])

    layer.set_weights(weights)
    return True


def _build_melanoma_model(image_size: tuple[int, int], num_classes: int) -> tf.keras.Model:
    h, w = int(image_size[0]), int(image_size[1])
    inputs = tf.keras.Input(shape=(h, w, 3), name="input_layer_1")
    base = tf.keras.applications.EfficientNetB0(
        include_top=False,
        weights=None,
        input_shape=(h, w, 3),
        pooling="avg",
    )

    x = base(inputs)
    x = tf.keras.layers.Dropout(0.4, name="dropout")(x)
    x = tf.keras.layers.Dense(256, activation="relu", name="dense")(x)
    x = tf.keras.layers.Dropout(0.3, name="dropout_1")(x)
    outputs = tf.keras.layers.Dense(num_classes, activation="softmax", name="dense_1")(x)
    return tf.keras.Model(inputs=inputs, outputs=outputs, name="sequential")


def _load_melanoma_metadata():
    global melanoma_label_names, melanoma_image_size, melanoma_num_classes
    if not os.path.exists(melanoma_metadata_path):
        return
    meta = joblib.load(melanoma_metadata_path)
    melanoma_label_names = meta.get("label_names") or melanoma_label_names
    melanoma_image_size = tuple(meta.get("image_size") or melanoma_image_size)
    melanoma_num_classes = int(meta.get("num_classes") or melanoma_num_classes)


def _try_load_melanoma_model() -> tf.keras.Model:
    _load_melanoma_metadata()

    # Best-case: load saved .keras model
    if os.path.exists(melanoma_model_path_keras):
        try:
            return tf.keras.models.load_model(melanoma_model_path_keras, compile=False)
        except Exception:
            pass

    model = _build_melanoma_model(melanoma_image_size, melanoma_num_classes)

    # Preferred: load standard weights file
    if os.path.exists(melanoma_weights_path):
        model.load_weights(melanoma_weights_path)
        return model

    # Fallback: load legacy .h5 (layer-by-layer mapping)
    if not os.path.exists(melanoma_legacy_h5_path):
        raise FileNotFoundError(
            "Missing melanoma weights. Expected one of: "
            f"{melanoma_model_path_keras}, {melanoma_weights_path}, {melanoma_legacy_h5_path}"
        )

    try:
        base = model.get_layer("efficientnetb0")
    except Exception:
        base = next(
            (
                layer
                for layer in model.layers
                if isinstance(layer, tf.keras.Model) and layer.name.lower().startswith("efficientnet")
            ),
            None,
        )
        if base is None:
            raise
    with h5py.File(melanoma_legacy_h5_path, "r") as f:
        mw = f["model_weights"]

        eff_key = None
        for k in mw.keys():
            if str(k).lower().startswith("efficientnet"):
                eff_key = k
                break
        if eff_key is None:
            raise ValueError("Missing EfficientNet weights group in melanoma .h5")
        eff = mw[eff_key]

        for layer in base.layers:
            if not layer.weights:
                continue
            group = eff.get(layer.name)
            _load_weights_from_h5_group(layer, group)

        for layer_name in ("dense", "dense_1"):
            layer = model.get_layer(layer_name)
            group = _resolve_h5_layer_group(mw, layer_name)
            _load_weights_from_h5_group(layer, group)

    return model


def ensure_melanoma_model_loaded() -> None:
    global melanoma_model, _melanoma_tried, _melanoma_load_error

    if os.environ.get("DISABLE_MELANOMA", "").strip() == "1":
        return

    if melanoma_model is not None or _melanoma_tried:
        return

    with _melanoma_lock:
        if melanoma_model is not None or _melanoma_tried:
            return
        _melanoma_tried = True
        try:
            melanoma_model = _try_load_melanoma_model()
            _melanoma_load_error = None
        except Exception as e:
            melanoma_model = None
            _melanoma_load_error = str(e)


def _preload_melanoma_background() -> None:  # pragma: no cover
    try:
        ensure_melanoma_model_loaded()
    except Exception:
        pass


if os.environ.get("PRELOAD_MELANOMA", "1").strip() == "1":  # pragma: no cover
    threading.Thread(target=_preload_melanoma_background, daemon=True).start()


# === HEALTH CHECK ===
@app.route("/", methods=["GET"])
def root():
    return jsonify({"status": "Backend API running"}), 200


@app.route("/health", methods=["GET"])
def health():
    try:
        ensure_melanoma_model_loaded()
    except Exception as e:
        pass

    return jsonify(
        {
            "status": "ok",
            "heart_loaded": heart_model is not None,
            "melanoma_loaded": melanoma_model is not None,
            "melanoma_tried": _melanoma_tried,
            "melanoma_error": _melanoma_load_error,
            "melanoma_disable_env": os.environ.get("DISABLE_MELANOMA"),
            "melanoma_h5_path": melanoma_legacy_h5_path,
            "melanoma_h5_exists": os.path.exists(melanoma_legacy_h5_path),
        }
    ), 200


# === PREDICT HEART ===
@app.route("/predict/heart", methods=["POST"])
def predict_heart():
    if heart_model is None:
        return jsonify({"error": f"Heart model failed to load: {heart_load_error}"}), 503
    try:
        data = request.get_json(force=True)
        X = _extract_ordered_features(data, HEART_FEATURES)
        if scaler is not None:
            X = scaler.transform(X)

        prob = _to_prob(heart_model.predict(X, verbose=0))
        label = "Positive" if prob >= 0.5 else "Negative"
        return jsonify({"prediction": label, "confidence": round(prob, 3)})
    except Exception as e:
        return jsonify({"error": str(e)}), 400


# === PREDICT DIABETES (not deployed) ===
@app.route("/predict/diabetes", methods=["POST"])
def predict_diabetes():
    return jsonify({"error": "Diabetes model not deployed yet"}), 501


# === PREDICT MELANOMA ===
@app.route("/predict/melanoma", methods=["POST"])
def predict_melanoma():
    try:
        ensure_melanoma_model_loaded()
        if melanoma_model is None:
            return jsonify({"error": _melanoma_load_error or "Melanoma model unavailable"}), 503

        if "image" not in request.files:
            return jsonify({"error": "No image provided"}), 400

        file = request.files["image"]
        img_bytes = io.BytesIO(file.read())

        target_size = tuple(melanoma_image_size)
        shape = getattr(melanoma_model, "input_shape", None)
        if shape and len(shape) >= 3 and shape[1] and shape[2]:
            target_size = (int(shape[1]), int(shape[2]))

        img = keras_image.load_img(img_bytes, target_size=target_size, color_mode="rgb")
        arr = keras_image.img_to_array(img) / 255.0
        arr = np.expand_dims(arr, axis=0)

        probs = np.ravel(melanoma_model.predict(arr, verbose=0))
        if probs.size == 0:
            raise ValueError("Empty prediction from melanoma model")

        top_idx = int(np.argmax(probs))
        top_prob = float(probs[top_idx])
        top_class = (
            melanoma_label_names[top_idx]
            if isinstance(melanoma_label_names, list) and top_idx < len(melanoma_label_names)
            else str(top_idx)
        )

        mel_prob = None
        if isinstance(melanoma_label_names, list) and "MEL" in melanoma_label_names:
            mel_prob = float(probs[melanoma_label_names.index("MEL")])

        # API expected by UI: Malignant vs Benign
        confidence = mel_prob if mel_prob is not None else top_prob
        label = "Malignant" if confidence >= 0.5 else "Benign"

        return jsonify(
            {
                "prediction": label,
                "confidence": round(confidence, 3),
                "top_class": top_class,
                "top_confidence": round(top_prob, 3),
                "melanoma_prob": round(mel_prob, 3) if mel_prob is not None else None,
            }
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 400


# === STROKE PLACEHOLDER ===
@app.route("/predict/stroke", methods=["POST"])
def predict_stroke():
    return jsonify({"error": "Stroke model not implemented yet"}), 501


# === MAIN ENTRY ===
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
