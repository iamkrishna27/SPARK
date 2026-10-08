import json
import pickle
import sys
import sys
import joblib

from fat_decoding import predict


MODEL_PATH = r"D:\FinTech_AI_Project\models\final_random_forest_model.joblib"
THRESHOLD = 0.33


try:
    model = joblib.load(MODEL_PATH)
except (
    FileNotFoundError,
    OSError,
    ImportError,
    EOFError,
    ValueError,
    pickle.UnpicklingError,
) as error:
    print(f"Could not load the ML model at {MODEL_PATH}: {error}")
    raise SystemExit(1)


# Read SME data from standard input
try:
    input_text = sys.stdin.read().strip()

    if not input_text:
        print("Prediction failed: No SME input was provided.")
        raise SystemExit(1)

    sample_sme = json.loads(input_text)

except json.JSONDecodeError as error:
    print(f"Prediction failed: Invalid JSON input: {error}")
    raise SystemExit(1)


try:
    result = predict(
        model=model,
        payload=sample_sme,
        threshold=THRESHOLD,
    )

    print(f"Adopter probability: {result['probability']:.4f}")
    print(f"Prediction: {result['label']}")

    if result["warnings"]:
        print("Warnings:")
        for warning in result["warnings"]:
            print(f"- {warning}")

except Exception as error:
    print(f"Prediction failed: {error}")
    raise SystemExit(1)