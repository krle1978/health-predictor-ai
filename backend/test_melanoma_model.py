import os
import sys

import numpy as np


def main() -> int:
    os.environ.setdefault("PRELOAD_MELANOMA", "0")

    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if repo_root not in sys.path:
        sys.path.insert(0, repo_root)

    import backend.app as a

    a.ensure_melanoma_model_loaded()
    if a.melanoma_model is None:
        print("ERROR: Melanoma model failed to load:", a._melanoma_load_error)
        return 1

    x = np.zeros((1, 160, 160, 3), dtype=np.float32)
    y = a.melanoma_model.predict(x, verbose=0)
    print("OK: Melanoma model loaded")
    print("Input:", a.melanoma_model.input_shape, "Output:", y.shape)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
