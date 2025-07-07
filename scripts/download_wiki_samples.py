# scripts/download_wiki_samples.py

from datasets import load_dataset
import json
import os
import ast

# 1) Carrega amostra
ds = load_dataset("wiki40b", "pt", split="train")
sample = ds.shuffle(seed=42).select(range(100))  # só pega 100

raw_texts = sample["text"]

# 2) Converte cada item em str Unicode limpa
texts = []
for t in raw_texts:
    # Caso já seja bytes
    if isinstance(t, (bytes, bytearray)):
        decoded = t.decode("utf-8", errors="replace")
    # Caso seja a repr de bytes, ex: "b'…\xc3\xa1…'"
    elif isinstance(t, str) and t.startswith(("b'", 'b"')):
        try:
            b = ast.literal_eval(t)              # transforma a repr em bytes
            decoded = b.decode("utf-8", errors="replace")
        except Exception:
            decoded = t                          # fallback: deixa como está
    else:
        decoded = t

    texts.append(decoded)

# 3) Salva no JSON
os.makedirs("data", exist_ok=True)
with open("data/wiki_samples.json", "w", encoding="utf-8") as f:
    json.dump(texts, f, ensure_ascii=False)

print(f"Salvou {len(texts)} textos em data/wiki_samples.json")
