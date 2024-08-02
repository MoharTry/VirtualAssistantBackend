from flask import Flask, jsonify
from speech_recognition import speech_to_text

app = Flask(__name__)

@app.route('/api/speech-to-text', methods=['POST'])
def transcribe_speech():
    try:
        transcription = speech_to_text(silence_limit=5)  # You can pass parameters as needed
        return jsonify({"transcription": transcription})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)
