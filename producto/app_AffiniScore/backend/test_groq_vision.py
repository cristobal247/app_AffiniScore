import os
import httpx
import json
from dotenv import load_dotenv

load_dotenv()

async def test():
    groq_api_key = os.environ.get("GROQ_API_KEY", "")
    print("GROQ_API_KEY loaded:", groq_api_key[:10] + "..." if groq_api_key else "None")
    
    system_prompt = "Say hello."
    user_content = [
        {"type": "text", "text": "Hi"},
        # We can send a small placeholder image or just try to send a test request
        {"type": "image_url", "image_url": {"url": "https://upload.wikimedia.org/wikipedia/commons/4/47/PNG_transparency_demonstration_1.png"}}
    ]
    
    try:
        model = "meta-llama/llama-4-scout-17b-16e-instruct"
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {groq_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_content}
                    ],
                    "temperature": 0.2
                },
                timeout=18.0
            )
            print("Status Code:", response.status_code)
            print("Response:", response.text)
    except Exception as e:
        print("Error calling Groq:", e)

if __name__ == "__main__":
    import asyncio
    asyncio.run(test())
