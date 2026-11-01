require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const { spawn } = require("child_process");

const app = express();
const PORT = process.env.PORT || 5000;

// Set PYTHON_PATH in .env (or the environment) to point to your interpreter.
// Defaults to "python3" which works on Linux/macOS; on Windows with the venv
// activated, "python" also resolves correctly from PATH.
const PYTHON_PATH = process.env.PYTHON_PATH || "python3";
const ML_SCRIPT_PATH = path.join(__dirname, "ml_predict.py");

// Allow requests from the React frontend.
app.use(cors());

// Read JSON request bodies.
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "FinTech backend is running",
  });
});

app.post("/api/predict", (req, res) => {
  const pythonProcess = spawn(PYTHON_PATH, [ML_SCRIPT_PATH]);

  let output = "";
  let errorOutput = "";

  pythonProcess.stdout.on("data", (data) => {
    output += data.toString();
  });

  pythonProcess.stderr.on("data", (data) => {
    errorOutput += data.toString();
  });

  pythonProcess.on("close", (code) => {
    if (code !== 0) {
      console.error("Python prediction failed:", errorOutput);

      return res.status(500).json({
        success: false,
        message: "Could not run the ML prediction",
      });
    }

    const probabilityMatch = output.match(
      /Adopter probability:\s*([0-9]*\.?[0-9]+)/
    );

    const predictionMatch = output.match(
      /Prediction:\s*(Adopter|Non-Adopter)/
    );

    if (!probabilityMatch || !predictionMatch) {
      console.error("Unexpected Python output:", output);

      return res.status(500).json({
        success: false,
        message: "Could not read the ML prediction result",
      });
    }

    res.json({
      success: true,
      adopter_probability: Number(probabilityMatch[1]),
      prediction: predictionMatch[1],
    });
  });

  pythonProcess.stdin.write(JSON.stringify(req.body));
  pythonProcess.stdin.end();
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});