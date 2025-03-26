// app/api/summarize/route.js
export async function POST(request) {
    try {
      console.log("Requisição recebida");
      // Recebe o JSON enviado pelo front-end
      const { text } = await request.json();
      // Monta o prompt pré-definido
      const prompt = `Resuma o seguinte texto de forma breve em português: ${text}`;
  
      // Chamada para a API do Ollama
      // Ajuste a URL, porta e o nome do modelo conforme sua configuração do Ollama
      const ollamaResponse = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "DeepSeek:latest", // substitua pelo nome do modelo configurado
          prompt: prompt,
          stream: false
        }),
      });
  
      if (!ollamaResponse.ok) {
        return new Response("Erro ao conectar com o Ollama", {
          status: ollamaResponse.status,
        });
      }
  
      // Retorna a resposta em streaming conforme recebida do Ollama
      return new Response(ollamaResponse.body, {
        headers: { "Content-Type": "text/plain" },
      });
    } catch (error) {
      return new Response("Erro interno do servidor", { status: 500 });
    }
  }
  