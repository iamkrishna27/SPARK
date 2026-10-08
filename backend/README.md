# FinTech Backend

A simple Express.js backend for the FinTech project.

## Run the backend

From this folder, install the dependencies and start the server:

```bash
npm install
npm start
```

The server runs at `http://localhost:5000`.

## Test the health endpoint

Open this URL in a browser:

```text
http://localhost:5000/api/health
```

Or send a GET request with `curl`:

```bash
curl http://localhost:5000/api/health
```

Expected response:

```json
{
  "success": true,
  "message": "FinTech backend is running"
}
```
