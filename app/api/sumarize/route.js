export async function POST(request) {
  try {
    console.log("Requisição recebida");

    // 1. Lê o JSON enviado pelo front-end
    const { text } = await request.json();

    // 2. Monta o prompt
    const prompt = `Resuma o seguinte texto de forma clara, concisa e objetiva em português, 
mantendo apenas as informações mais importantes. Siga estas diretrizes:
1. Seja breve, mas preserve o significado original.
2. Evite repetições ou detalhes irrelevantes.
3. Use frases curtas e simples.
4. Mantenha a coerência e a lógica do texto original.

Texto para resumir: "${text}"`;

    // 3. Chama a API do Ollama com stream habilitado
    const ollamaResponse = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gemma3:1b", // substitua pelo nome do modelo configurado
        prompt: prompt,
        stream: true // IMPORTANTE: ativar streaming
      })
    });

    if (!ollamaResponse.ok) {
      return new Response("Erro ao conectar com o Ollama", {
        status: ollamaResponse.status,
      });
    }

    // 4. Criar uma ReadableStream para repassar ao cliente somente o texto parcial.
    //    O Ollama, quando stream: true, envia JSONs linha a linha, no formato:
    //    { "response": "...", "model": "...", "created_at": "...", "done": false }
    //    Cada linha será um JSON com parte do texto em "response".
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // Verifica se a response tem body, caso contrário dá erro
    if (!ollamaResponse.body) {
      throw new Error("Não há body na resposta do Ollama.");
    }

    // 5. Cria a ReadableStream que converte cada chunk JSON em texto puro
    const stream = new ReadableStream({
      async start(controller) {
        const reader = ollamaResponse.body.getReader();

        let done = false;
        let partialLine = "";

        while (!done) {
          const { value, done: doneReading } = await reader.read();
          done = doneReading;

          if (value) {
            // Converte o chunk em string
            const chunkString = decoder.decode(value);
            // Pode vir mais de uma linha em cada chunk, então dividimos
            const lines = (partialLine + chunkString).split("\n");

            // A última linha pode estar incompleta, salvamos em partialLine
            partialLine = lines.pop() || "";

            // Para cada linha completa, extrair o JSON e pegar `response`
            for (const line of lines) {
              if (!line.trim()) continue; // ignora linha vazia

              try {
                const json = JSON.parse(line);
                // Se houver texto parcial no campo `response`, enviamos ao cliente
                if (json.response) {
                  const textChunk = json.response;
                  controller.enqueue(encoder.encode(textChunk));
                }
                // Se o Ollama indicar que finalizou (done = true), encerramos o stream
                if (json.done) {
                  done = true;
                  break;
                }
              } catch (error) {
                console.error("Erro fazendo parse da linha:", line, error);
              }
            }
          }
        }

        // Se sobrou algo em partialLine, pode haver um JSON parcial. 
        // Mas, em geral, Ollama envia `done: true` antes de fechar o stream,
        // então normalmente não precisaríamos tratar aqui.

        // Fecha o stream
        controller.close();
      }
    });

    // 6. Retorna o stream para o front-end
    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked"
      }
    });

  } catch (error) {
    console.error("Erro na API:", error);
    return new Response("Erro interno do servidor", { status: 500 });
  }
}
