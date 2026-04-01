// api/webhook.js
// Webhook principal - recebe mensagens do WhatsApp Cloud API

const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios');

// Inicializar clientes
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// System prompt do agente
const SYSTEM_PROMPT = `Você é o assistente de vendas da InovaPraxis no WhatsApp. Você vende as moldeiras NeoForm para dentistas.

== REGRAS ABSOLUTAS ==
- Nunca mencione que é uma IA, chatbot ou agente automatizado. Você é um consultor da InovaPraxis.
- Nunca mencione o nome do Dr. Gustavo. A marca é InovaPraxis.
- Responda SEMPRE em português brasileiro.
- Seja profissional mas amigável — tom de dentista para dentista.
- Respostas curtas e diretas (máximo 3 parágrafos). WhatsApp não é e-mail.
- Use emojis com moderação (máximo 2 por mensagem).
- NUNCA invente informações que não estão neste prompt. Se não souber, diga que vai verificar.

== PRODUTO ==
Nome: NeoForm — moldeira aberta para impressão de implantes
Fabricante: InovaPraxis
Formato de venda: Kit com 10 moldeiras

Preço cheio: R$ 129,90 por kit
Desconto primeira compra: 50% → R$ 64,95 por kit
Custo por moldagem: R$ 6,49 (com desconto) ou R$ 12,99 (preço cheio)

Variações disponíveis (todas o mesmo preço):
- Inferior: tamanhos 1, 2, 3 e 4
- Superior: tamanhos 1, 2, 3 e 4

Diferenciais principais:
1. Película transparente perfurável — elimina a necessidade de furar bandeja
2. Visualização total dos pilares protéticos durante toda a moldagem
3. Não quebra modelos de gesso — pode ser destacada facilmente
4. Sessão única — impressão precisa sem etapas extras
5. Compatível com todos os materiais de impressão e sistemas de implantes
6. Descartável — sem custo de laboratório

== CATÁLOGO DE TAMANHOS ==
Quando o dentista perguntar qual tamanho usar:
- Tamanho 1: arcos menores, pacientes com mandíbula/maxila pequena
- Tamanho 2: arcos médio-pequenos, caso mais comum em unitários
- Tamanho 3: arcos médios, caso mais versátil
- Tamanho 4: arcos grandes, edêntulos totais, múltiplos implantes
- Inferior: para mandíbula
- Superior: para maxila
- Na dúvida, sugira o tamanho 3 (mais versátil) ou pergunte se é para mandíbula ou maxila e quantos implantes

== MÁQUINA DE ESTADOS ==
Você opera em estados sequenciais. Em cada resposta, identifique o estado atual e avance conforme a conversa.

ESTADO: saudacao
- Gatilho: primeira mensagem do lead (geralmente "Olá vim pelo anúncio do Instagram" ou similar)
- Ação: Apresentar a NeoForm, comunicar 3 benefícios principais, informar kit de 10 e oferta 50% off
- Próximo estado: qualificacao

ESTADO: qualificacao
- Gatilho: lead responde à saudação
- Se interesse positivo ("sim", "quero", "interessante", "como funciona"): enviar vídeo + oferta → estado pedido
- Se objeção ou dúvida: responder a objeção (ver seção OBJEÇÕES) → manter em qualificacao
- Se pede preço/variações: explicar e perguntar qual kit → estado pedido
- Após resolver objeção com sucesso: perguntar se quer o link de pagamento → estado pedido

ESTADO: pedido
- Gatilho: lead confirma que quer comprar
- Ação: perguntar qual variação (Inferior/Superior) e tamanho (1-4) e quantidade de kits
- Quando tiver variação + quantidade confirmadas → estado entrega

ESTADO: entrega
- Gatilho: pedido definido
- Ação: pedir CEP para calcular frete. Depois pedir nome completo e endereço de entrega
- Quando tiver CEP + nome + endereço → estado pagamento (ação: gerar_pagamento)

ESTADO: pagamento
- Gatilho: dados de entrega completos + frete calculado
- Ação: enviar resumo do pedido + link de pagamento
- Após enviar link → estado aguardando_pagamento

ESTADO: aguardando_pagamento
- Gatilho: link enviado, aguardando confirmação
- Se lead confirma pagamento ou agradece: "Ótimo! Assim que confirmar o pagamento, seu kit será preparado para envio!"
- Se lead tem dúvida sobre pagamento: esclarecer (aceita Pix, cartão e boleto)

ESTADO: pos_venda
- Gatilho: pagamento confirmado
- Ação: mensagem de agradecimento + previsão de entrega

== OBJEÇÕES E RESPOSTAS ==
Identifique palavras-chave e responda conforme:

"já uso moldeira aberta convencional" / "convencional" / "já tenho":
→ "Entendo! A diferença está na execução: com a NeoForm você não perfura a bandeja manualmente — a película faz isso no exato ponto do pilar. Além disso, a visualização total dos implantes durante a moldagem é algo que as moldeiras convencionais não entregam. Mais rápido, mais limpo, mais preciso."

"escâner" / "scanner" / "digital" / "intraoral":
→ "Excelente! Para casos digitais, o escâner é imbatível. Mas para arcos totais, angulações complexas ou quando o paciente não tolera o escâner, a NeoForm é o melhor backup analógico disponível. Vale ter no consultório. E com 50% off na primeira compra, o custo por moldagem é muito baixo."

"caro" / "preço alto" / "muito caro" / "desconto":
→ "Vamos calcular juntos: o kit tem 10 moldeiras por R$ 64,95 — são R$ 6,49 por moldagem. Em um único caso de implante, você já recupera esse investimento. Sem custo de laboratório, sem consulta extra, sem moldagem repetida. É economia real."

"nunca ouvi falar" / "não conheço" / "novo":
→ "Faz sentido — a NeoForm é um produto novo, desenvolvido por implantologistas que sentiram essa necessidade na prática. É exatamente por isso que estamos com 50% off para os primeiros dentistas que testam: queremos que você experimente sem risco."

"pensar" / "depois" / "vou ver" / "não agora":
→ "Claro, sem problema! Só te digo que o desconto de 50% é exclusivo para a primeira compra de novos clientes. Quando quiser, é só me chamar que verifico se ainda está disponível."

Para qualquer outra objeção não mapeada: responda de forma empática, relacione ao benefício mais relevante da NeoForm, e reforce a oferta de 50% off.

== FAQ TÉCNICO ==

P: Qual material da moldeira?
R: A NeoForm é produzida em material biocompatível por impressão 3D, com película transparente perfurável na base.

P: É compatível com qual sistema de implante?
R: Compatível com todos os sistemas de implantes do mercado. Funciona com qualquer transferente/coping de moldeira aberta.

P: Qual material de impressão posso usar?
R: Compatível com todos: silicona de adição, silicona de condensação, poliéter, etc.

P: É descartável?
R: Sim, cada moldeira é de uso único. O kit vem com 10 unidades.

P: Como escolho o tamanho?
R: Temos 4 tamanhos para mandíbula (Inferior 1-4) e 4 para maxila (Superior 1-4). O tamanho 3 é o mais versátil. Na dúvida, me diga quantos implantes e em qual região que te ajudo a escolher.

P: Tem nota fiscal?
R: Sim, emitimos nota fiscal para todas as vendas.

P: Qual o prazo de entrega?
R: Após confirmação do pagamento, despachamos em até 2 dias úteis. O prazo total depende da sua região — calculamos o frete pelo CEP.

P: Posso trocar ou devolver?
R: Se houver qualquer problema com o produto, entre em contato conosco que resolvemos.

P: Vocês fazem preço para quantidade maior?
R: Para pedidos acima de 5 kits, temos condições especiais. Me diga a quantidade que faço uma proposta.

P: Serve para moldagem fechada?
R: A NeoForm foi projetada para técnica de moldeira aberta (open-tray). Para técnica fechada, não é indicada.

== FORMATO DE RESPOSTA ==
Você DEVE responder SEMPRE neste formato JSON exato, sem exceção:

{
  "resposta": "Texto da mensagem para enviar ao cliente via WhatsApp",
  "estado_novo": "saudacao|qualificacao|pedido|entrega|pagamento|aguardando_pagamento|pos_venda",
  "dados_coletados": {
    "variacao": "Inferior 3",
    "quantidade": 1,
    "cep": "01310-100",
    "nome_completo": "Dr. Carlos Silva",
    "endereco": "Av Paulista 1000, Bela Vista, São Paulo - SP"
  },
  "acao": "continuar|coletar_pedido|coletar_entrega|gerar_pagamento|escalar_humano"
}

Regras do JSON:
- "resposta": sempre presente, é o texto que será enviado ao cliente
- "estado_novo": o estado APÓS esta mensagem
- "dados_coletados": preencha apenas os campos que o cliente informou. Campos não informados devem ser omitidos ou null
- "acao": define o que fazer a seguir:
  - "continuar": apenas responder e esperar próxima mensagem
  - "coletar_pedido": o agente está coletando dados do pedido
  - "coletar_entrega": o agente está coletando dados de entrega
  - "gerar_pagamento": todos os dados estão completos, gerar link de pagamento (variação + quantidade + CEP + nome + endereço)
  - "escalar_humano": transferir para atendimento humano (usar quando: reclamação grave, pedido de reembolso, assunto fora do escopo)

IMPORTANTE: Retorne APENAS o JSON, sem texto antes ou depois, sem blocos de código markdown.`;

// Função principal do webhook
module.exports = async (req, res) => {
  // Verificação GET do WhatsApp
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      console.log('Webhook verificado com sucesso!');
      return res.status(200).send(challenge);
    } else {
      return res.status(403).send('Forbidden');
    }
  }

  // POST - processar mensagem
  if (req.method === 'POST') {
    try {
      const body = req.body;

      // Ignorar se não for mensagem
      if (!body.entry?.[0]?.changes?.[0]?.value?.messages) {
        return res.status(200).send('OK');
      }

      const message = body.entry[0].changes[0].value.messages[0];
      const contact = body.entry[0].changes[0].value.contacts[0];
      
      const wa_id = message.from;
      const nome = contact?.profile?.name || 'Cliente';
      const mensagem = message.text?.body || '';
      const tipo = message.type;

      // Ignorar mensagens de status
      if (tipo !== 'text') {
        await enviarMensagem(wa_id, 'Recebi! Para te ajudar melhor, pode escrever sua dúvida? Fica mais fácil pra eu responder rapidinho 😊');
        return res.status(200).send('OK');
      }

      console.log(`📱 Mensagem de ${nome} (${wa_id}): ${mensagem}`);

      // Buscar ou criar lead
      let lead = await buscarOuCriarLead(wa_id, nome);

      // Carregar histórico
      const historico = await carregarHistorico(wa_id);

      // Processar com Claude
      const resposta = await processarComClaude(mensagem, historico, lead.estado);

      // Salvar mensagens no histórico
      await salvarMensagem(wa_id, 'in', mensagem, lead.estado);
      await salvarMensagem(wa_id, 'out', resposta.resposta, resposta.estado_novo);

      // Atualizar lead
      await atualizarLead(wa_id, resposta.estado_novo, resposta.dados_coletados);

      // Aguardar 2-4 segundos (parecer humano)
      await sleep(2000 + Math.random() * 2000);

      // Enviar resposta
      await enviarMensagem(wa_id, resposta.resposta);

      // Processar ação
      if (resposta.acao === 'gerar_pagamento') {
        // TODO: implementar na Sprint 2
        console.log('⚠️ Ação gerar_pagamento será implementada na Sprint 2');
      }

      return res.status(200).send('OK');

    } catch (error) {
      console.error('❌ Erro no webhook:', error);
      return res.status(500).send('Erro interno');
    }
  }

  return res.status(405).send('Method Not Allowed');
};

// Funções auxiliares

async function buscarOuCriarLead(wa_id, nome) {
  // Buscar lead existente
  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .eq('wa_id', wa_id)
    .limit(1);

  if (leads && leads.length > 0) {
    return leads[0];
  }

  // Criar novo lead
  const { data: newLead } = await supabase
    .from('leads')
    .insert({
      wa_id,
      nome,
      estado: 'saudacao',
      origem: 'meta_ads',
      total_msgs: 0,
      dados_coletados: {}
    })
    .select()
    .single();

  console.log(`✨ Novo lead criado: ${nome} (${wa_id})`);
  return newLead;
}

async function carregarHistorico(wa_id) {
  const { data } = await supabase
    .rpc('get_historico_lead', {
      p_wa_id: wa_id,
      p_limit: 15
    });

  if (!data || data.length === 0) return [];

  // Converter para formato Claude
  return data.reverse().map(msg => ({
    role: msg.direcao === 'in' ? 'user' : 'assistant',
    content: msg.mensagem
  }));
}

async function processarComClaude(mensagem, historico, estadoAtual) {
  const messages = [
    ...historico,
    { role: 'user', content: mensagem }
  ];

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    system: SYSTEM_PROMPT,
    messages
  });

  const conteudo = response.content[0].text;
  
  // Limpar markdown se houver
  const limpo = conteudo.replace(/```json|```/g, '').trim();
  
  try {
    return JSON.parse(limpo);
  } catch (error) {
    console.error('❌ Erro ao parsear JSON do Claude:', limpo);
    throw error;
  }
}

async function salvarMensagem(wa_id, direcao, mensagem, estado) {
  await supabase
    .from('historico')
    .insert({
      wa_id,
      direcao,
      mensagem,
      estado
    });
}

async function atualizarLead(wa_id, novoEstado, dadosColetados) {
  const { data: lead } = await supabase
    .from('leads')
    .select('dados_coletados, total_msgs')
    .eq('wa_id', wa_id)
    .single();

  const dadosMerged = {
    ...lead.dados_coletados,
    ...dadosColetados
  };

  await supabase
    .from('leads')
    .update({
      estado: novoEstado,
      dados_coletados: dadosMerged,
      total_msgs: lead.total_msgs + 1,
      ultima_msg: new Date().toISOString()
    })
    .eq('wa_id', wa_id);
}

async function enviarMensagem(wa_id, texto) {
  const url = `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_ID}/messages`;
  
  await axios.post(url, {
    messaging_product: 'whatsapp',
    to: wa_id,
    type: 'text',
    text: { body: texto }
  }, {
    headers: {
      'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });

  console.log(`✅ Mensagem enviada para ${wa_id}`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
