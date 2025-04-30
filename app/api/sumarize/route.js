// app/api/sumarize/route.js
export async function POST(request) {
  const { text } = await request.json();
  const prompt = `Resuma o seguinte texto de forma clara, concisa e objetiva em português:\n"${text}"`;

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

          // --- filtra tudo entre <think> e </think> ---
          let clean = "";
          let buf = chunk;
          while (buf.length) {
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
                // ainda dentro do think, descarta tudo
                buf = "";
              }
            }
          }

          if (clean) {
            controller.enqueue(encoder.encode(clean));
          }

          if (json.done) {
            controller.close();
            return;
          }
        }
      }

      // sobra em partial (sem newline) — processa igual
      if (partial) {
        // pode repetir o mesmo filtro acima, mas normalmente partial é texto limpo
        controller.enqueue(encoder.encode(partial));
      }
      controller.close();
    }
  }), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked"
    }
  });
}
