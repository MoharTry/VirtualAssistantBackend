from vosk import Model, KaldiRecognizer
import pyaudio
import json
import time

def speech_to_text(silence_limit=5):
    model = Model("/media/mohar/OS/Users/Mohar/Projects/TextGeneration/models/vosk-model-en-in-0.5")
    recognizer = KaldiRecognizer(model, 16000)

    mic = pyaudio.PyAudio()
    stream = mic.open(format=pyaudio.paInt16, channels=1, rate=16000, input=True, frames_per_buffer=8192)
    stream.start_stream()

    print("Listening... Speak your prompt.")

    full_text = ""
    silence_threshold = 0.1
    silence_duration = 0
    last_speech_time = time.time()

    while True:
        data = stream.read(4096)
        if recognizer.AcceptWaveform(data):
            result = json.loads(recognizer.Result())
            text = result['text']
            if text:
                print(f"Recognized: {text}")
                full_text += text + " "
                last_speech_time = time.time()
                silence_duration = 0
        else:
            silence_duration += 0.256

        if silence_duration > silence_limit and time.time() - last_speech_time > silence_limit:
            break

    stream.stop_stream()
    stream.close()
    mic.terminate()

    return full_text.strip()
