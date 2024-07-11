import requests
import json

# Replace with your actual API key
API_KEY = "sk_c51e8c1b4e0c99cb09c49befd7edabca143b397763c9db2d"

# API endpoint
URL = "https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM"

# Headers
headers = {
    "Accept": "audio/mpeg",
    "Content-Type": "application/json",
    "xi-api-key": API_KEY
}

# Data payload
data = {
    "text": "Hello, this is a test of the ElevenLabs API.",
    "model_id": "eleven_monolingual_v1",
    "voice_settings": {
        "stability": 0.5,
        "similarity_boost": 0.5
    }
}

# Send POST request
response = requests.post(URL, json=data, headers=headers)

# Check if the request was successful
if response.status_code == 200:
    # Save the audio file
    with open("test_audio.mp3", "wb") as audio_file:
        audio_file.write(response.content)
    print("Audio file saved successfully.")
else:
    print(f"Error: {response.status_code}")
    print(response.text)




    