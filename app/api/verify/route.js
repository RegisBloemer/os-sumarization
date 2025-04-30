// app/api/verify/route.js
export async function POST(request) {
    try {
      const { text, summary } = await request.json();
  
      const prompt = `Texto original:\n"${text}"\n\nResumo atual:\n"${summary}"\n\n` +
                     `Melhore o resumo (conciso, coerente) e envie palavra a palavra.`;
    console.log("Prompt:", prompt);
      const ollamaRes = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "qwen3:0.6b", prompt, stream: true })
      });
      if (!ollamaRes.ok) return new Response("Erro no Ollama", { status: ollamaRes.status });
      if (!ollamaRes.body) throw new Error("Resposta do Ollama sem body.");
  
      const reader = ollamaRes.body.getReader();
      const decoder = new TextDecoder();
      const encoder = new TextEncoder();
  
      return new Response(new ReadableStream({
        async start(controller) {
          let partial = "";
          let skippingThink = false;
          let wordBuf = "";
          let isFirst = true;
  
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            partial += decoder.decode(value, { stream: true });
  
            const lines = partial.split("\n");
            partial = lines.pop() || "";
  
            for (const line of lines) {
              if (!line.trim()) continue;
              let json;
              try { json = JSON.parse(line); } catch { continue; }
              let chunk = json.response || "";
  
              // filtra <think>...</think>
              let clean = "";
              let buf = chunk;
              while (buf) {
                if (!skippingThink) {
                  const i = buf.indexOf("<think>");
                  if (i >= 0) {
                    clean += buf.slice(0, i);
                    buf = buf.slice(i + 7);
                    skippingThink = true;
                  } else {
                    clean += buf;
                    buf = "";
                  }
                } else {
                  const j = buf.indexOf("</think>");
                  if (j >= 0) {
                    buf = buf.slice(j + 8);
                    skippingThink = false;
                  } else {
                    buf = "";
                  }
                }
              }
  
              if (clean) {
                wordBuf += clean;
                const parts = wordBuf.split(/\s+/);
                for (let i = 0; i < parts.length - 1; i++) {
                  let w = parts[i];
                  if (isFirst) {
                    w = w.replace(/^\s+/, "");  // corta espaços iniciais apenas no primeiro
                    isFirst = false;
                  }
                  controller.enqueue(encoder.encode(w + " "));
                }
                wordBuf = parts[parts.length - 1];
              }
  
              if (json.done) {
                if (wordBuf) {
                  let finalW = wordBuf;
                  if (isFirst) finalW = finalW.replace(/^\s+/, "");
                  controller.enqueue(encoder.encode(finalW));
                }
                controller.close();
                return;
              }
            }
          }
  
          // resto em wordBuf
          if (wordBuf) {
            let finalW = wordBuf;
            if (isFirst) finalW = finalW.replace(/^\s+/, "");
            controller.enqueue(encoder.encode(finalW));
          }
          controller.close();
        }
      }), {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Transfer-Encoding": "chunked"
        }
      });
  
    } catch (error) {
      console.error("Erro /api/verify:", error);
      return new Response("Erro interno", { status: 500 });
    }
  }
  