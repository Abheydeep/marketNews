import sys
import json
import os
from openai import OpenAI

def main():
    try:
        input_data = sys.stdin.read()
        if not input_data.strip():
            return
            
        payload = json.loads(input_data)
        
        client = OpenAI(
            base_url="https://integrate.api.nvidia.com/v1",
            api_key=os.environ.get("NVIDIA_API_KEY", payload.get("api_key", "")),
            timeout=None,
            max_retries=3
        )

        model = payload.get("model")
        messages = payload.get("messages", [])
        temperature = payload.get("temperature", 1.0)
        top_p = payload.get("top_p", 0.95)
        max_tokens = int(payload.get("max_tokens", 16384))
        
        extra_body = payload.get("extra_body", {})
        if "chat_template_kwargs" in payload:
            extra_body["chat_template_kwargs"] = payload["chat_template_kwargs"]

        kwargs = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "top_p": top_p,
            "max_tokens": max_tokens,
            "stream": True
        }
        
        if extra_body:
            kwargs["extra_body"] = extra_body

            
        completion = client.chat.completions.create(**kwargs)
        
        full_content = ""
        for chunk in completion:
            if not chunk.choices:
                continue
            if chunk.choices[0].delta.content is not None:
                full_content += chunk.choices[0].delta.content
                
        print(json.dumps({"content": full_content}))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    main()
