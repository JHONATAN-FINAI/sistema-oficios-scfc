import { db } from "../db";
import { users, destinatarios, templates, classificacaoOrcamentaria } from "../db/schema";
import { createHash } from "crypto";

function md5(text: string) {
  return createHash("md5").update(text).digest("hex");
}

async function seed() {
  console.log("Iniciando seed...");

  await db.insert(users).values({
    email: "admin@scfc.com",
    senhaHash: md5("admin123"),
    nome: "Administrador SCFC",
    role: "admin",
  }).onConflictDoNothing();

  await db.insert(destinatarios).values([
    { codigo: "001", nome: "SECRETARIA MUNICIPAL DE GOVERNO", cidade: "Rondonópolis - MT" },
    { codigo: "002", nome: "PROCURADORIA GERAL DO MUNICÍPIO", cidade: "Rondonópolis - MT" },
    { codigo: "003", nome: "PROCON", cidade: "Rondonópolis - MT" },
    { codigo: "004", nome: "SECRETARIA MUNICIPAL DE RECEITA", cidade: "Rondonópolis - MT" },
    { codigo: "005", nome: "SECRETARIA MUNICIPAL DE EDUCAÇÃO", cidade: "Rondonópolis - MT" },
    { codigo: "006", nome: "SECRETARIA MUNICIPAL DE TRANSPORTE E TRÂNSITO", cidade: "Rondonópolis - MT" },
    { codigo: "007", nome: "SECRETARIA MUNICIPAL DE DESENVOLVIMENTO ECONÔMICO", cidade: "Rondonópolis - MT" },
    { codigo: "008", nome: "SECRETARIA MUNICIPAL DE PROMOÇÃO E ASSISTÊNCIA SOCIAL", cidade: "Rondonópolis - MT" },
    { codigo: "009", nome: "SECRETARIA MUNICIPAL DE SAÚDE", cidade: "Rondonópolis - MT" },
    { codigo: "010", nome: "SECRETARIA MUNICIPAL DE ADMINISTRAÇÃO", cidade: "Rondonópolis - MT" },
  ]).onConflictDoNothing();

  await db.insert(templates).values([
    {
      nome: "Ofício de Empenho",
      descricao: "Solicitação de empenho com classificação orçamentária",
      usaClassificacao: true,
      conteudo: `<p>Prezados Senhores,</p><p>Vimos por meio deste solicitar a V.Sa. a emissão de empenho referente à despesa abaixo especificada, visando atender às necessidades desta Superintendência de Controle de Frotas e Combustível.</p><p>Atenciosamente,</p>`,
    },
    {
      nome: "Ofício de Contrato",
      descricao: "Comunicado referente a contratos",
      usaClassificacao: false,
      conteudo: `<p>Prezados Senhores,</p><p>Vimos por meio deste comunicar a V.Sa. sobre o contrato em referência, solicitando as providências cabíveis para o regular cumprimento de suas cláusulas.</p><p>Atenciosamente,</p>`,
    },
    {
      nome: "Ofício de Solicitação",
      descricao: "Solicitação geral de materiais ou serviços",
      usaClassificacao: false,
      conteudo: `<p>Prezados Senhores,</p><p>Vimos por meio deste solicitar a V.Sa. providências quanto ao assunto em epígrafe.</p><p>Atenciosamente,</p>`,
    },
    {
      nome: "Ofício Geral",
      descricao: "Modelo em branco para uso geral",
      usaClassificacao: false,
      conteudo: `<p>Prezados Senhores,</p><p></p><p>Atenciosamente,</p>`,
    },
  ]).onConflictDoNothing();

  console.log("Seed concluído com sucesso!");
  // Classificação Orçamentária (importada do Report.xlsx)
  await db.insert(classificacaoOrcamentaria).values([
    { reduzido: "789", funcional: "02.015.04.122.2303.1020", fonte: "1.500.0000000", naturezaDespesa: "Serviços de Tecnologia da Informação e Comunicação - Pessoa Jurídica", elemento: "4.4.90", subelemento: "40" },
    { reduzido: "790", funcional: "02.015.04.122.2303.1020", fonte: "1.500.0000000", naturezaDespesa: "Equipamentos e Material Permanente", elemento: "4.4.90", subelemento: "52" },
    { reduzido: "772", funcional: "02.015.04.122.2303.2126", fonte: "1.500.0000000", naturezaDespesa: "Diárias - Civil", elemento: "3.3.90", subelemento: "14" },
    { reduzido: "773", funcional: "02.015.04.122.2303.2126", fonte: "1.500.0000000", naturezaDespesa: "Material de Consumo", elemento: "3.3.90", subelemento: "30" },
    { reduzido: "774", funcional: "02.015.04.122.2303.2126", fonte: "1.500.0000000", naturezaDespesa: "Passagens e Despesas com Locomoção", elemento: "3.3.90", subelemento: "33" },
    { reduzido: "775", funcional: "02.015.04.122.2303.2126", fonte: "1.500.0000000", naturezaDespesa: "Outras Despesas de Pessoal Decorrentes de Contratos de Terceirização", elemento: "3.3.90", subelemento: "34" },
    { reduzido: "776", funcional: "02.015.04.122.2303.2126", fonte: "1.500.0000000", naturezaDespesa: "Serviços de Consultoria", elemento: "3.3.90", subelemento: "35" },
    { reduzido: "777", funcional: "02.015.04.122.2303.2126", fonte: "1.500.0000000", naturezaDespesa: "Outros Serviços de Terceiros - Pessoa Física", elemento: "3.3.90", subelemento: "36" },
    { reduzido: "778", funcional: "02.015.04.122.2303.2126", fonte: "1.500.0000000", naturezaDespesa: "Outros Serviços de Terceiros - Pessoa Jurídica", elemento: "3.3.90", subelemento: "39" },
    { reduzido: "779", funcional: "02.015.04.122.2303.2126", fonte: "1.500.0000000", naturezaDespesa: "Serviços de Tecnologia da Informação e Comunicação - Pessoa Jurídica", elemento: "3.3.90", subelemento: "40" },
    { reduzido: "780", funcional: "02.015.04.122.2303.2126", fonte: "1.500.0000000", naturezaDespesa: "Obrigações Tributárias e Contributivas", elemento: "3.3.90", subelemento: "47" },
    { reduzido: "781", funcional: "02.015.04.122.2303.2126", fonte: "1.500.0000000", naturezaDespesa: "Despesas de Exercícios Anteriores", elemento: "3.3.90", subelemento: "92" },
    { reduzido: "755", funcional: "02.015.04.122.2303.2237", fonte: "1.500.0000000", naturezaDespesa: "Contratação por Tempo Determinado", elemento: "3.1.90", subelemento: "04" },
    { reduzido: "756", funcional: "02.015.04.122.2303.2237", fonte: "1.500.0000000", naturezaDespesa: "Vencimentos e Vantagens Fixas - Pessoal Civil", elemento: "3.1.90", subelemento: "11" },
    { reduzido: "757", funcional: "02.015.04.122.2303.2237", fonte: "1.500.0000000", naturezaDespesa: "Obrigações Patronais", elemento: "3.1.90", subelemento: "13" },
    { reduzido: "758", funcional: "02.015.04.122.2303.2237", fonte: "1.500.0000000", naturezaDespesa: "Ressarcimento de Despesas de Pessoal Requisitado", elemento: "3.1.90", subelemento: "96" },
    { reduzido: "759", funcional: "02.015.04.122.2303.2237", fonte: "1.500.0000000", naturezaDespesa: "Obrigações Patronais", elemento: "3.1.91", subelemento: "13" },
    { reduzido: "760", funcional: "02.015.04.122.2303.2237", fonte: "1.500.0000000", naturezaDespesa: "Indenizações e Restituições", elemento: "3.3.90", subelemento: "93" },
    { reduzido: "761", funcional: "02.015.04.122.2303.2237", fonte: "1.500.0000000", naturezaDespesa: "Obrigações Tributárias e Contributivas", elemento: "3.3.91", subelemento: "47" },
    { reduzido: "791", funcional: "02.015.04.122.2303.2317", fonte: "1.500.0000000", naturezaDespesa: "Material de Consumo", elemento: "3.3.90", subelemento: "30" },
    { reduzido: "792", funcional: "02.015.04.122.2303.2317", fonte: "1.500.0000000", naturezaDespesa: "Outros Serviços de Terceiros - Pessoa Física", elemento: "3.3.90", subelemento: "36" },
    { reduzido: "793", funcional: "02.015.04.122.2303.2317", fonte: "1.500.0000000", naturezaDespesa: "Outros Serviços de Terceiros - Pessoa Jurídica", elemento: "3.3.90", subelemento: "39" },
    { reduzido: "762", funcional: "02.015.04.122.2303.2490", fonte: "1.501.0000000", naturezaDespesa: "Diárias - Civil", elemento: "3.3.90", subelemento: "14" },
    { reduzido: "763", funcional: "02.015.04.122.2303.2490", fonte: "1.501.0000000", naturezaDespesa: "Material de Consumo", elemento: "3.3.90", subelemento: "30" },
    { reduzido: "764", funcional: "02.015.04.122.2303.2490", fonte: "1.501.0000000", naturezaDespesa: "Passagens e Despesas com Locomoção", elemento: "3.3.90", subelemento: "33" },
    { reduzido: "765", funcional: "02.015.04.122.2303.2490", fonte: "1.501.0000000", naturezaDespesa: "Outras Despesas de Pessoal Decorrentes de Contratos de Terceirização", elemento: "3.3.90", subelemento: "34" },
    { reduzido: "766", funcional: "02.015.04.122.2303.2490", fonte: "1.500.0000000", naturezaDespesa: "Outros Serviços de Terceiros - Pessoa Física", elemento: "3.3.90", subelemento: "36" },
    { reduzido: "767", funcional: "02.015.04.122.2303.2490", fonte: "1.501.0000000", naturezaDespesa: "Outros Serviços de Terceiros - Pessoa Jurídica", elemento: "3.3.90", subelemento: "39" },
    { reduzido: "768", funcional: "02.015.04.122.2303.2490", fonte: "1.501.0000000", naturezaDespesa: "Serviços de Tecnologia da Informação e Comunicação - Pessoa Jurídica", elemento: "3.3.90", subelemento: "40" },
    { reduzido: "769", funcional: "02.015.04.122.2303.2490", fonte: "1.501.0000000", naturezaDespesa: "Obrigações Tributárias e Contributivas", elemento: "3.3.90", subelemento: "47" },
    { reduzido: "770", funcional: "02.015.04.122.2303.2490", fonte: "1.501.0000000", naturezaDespesa: "Despesas de Exercícios Anteriores", elemento: "3.3.90", subelemento: "92" },
    { reduzido: "771", funcional: "02.015.04.122.2303.2490", fonte: "1.501.0000000", naturezaDespesa: "Indenizações e Restituições", elemento: "3.3.90", subelemento: "93" },
    { reduzido: "782", funcional: "02.015.04.122.2303.2491", fonte: "1.500.0000000", naturezaDespesa: "Contratação por Tempo Determinado", elemento: "3.1.90", subelemento: "04" },
    { reduzido: "783", funcional: "02.015.04.122.2303.2491", fonte: "1.500.0000000", naturezaDespesa: "Vencimentos e Vantagens Fixas - Pessoal Civil", elemento: "3.1.90", subelemento: "11" },
    { reduzido: "784", funcional: "02.015.04.122.2303.2491", fonte: "1.500.0000000", naturezaDespesa: "Obrigações Patronais", elemento: "3.1.90", subelemento: "13" },
    { reduzido: "1058", funcional: "02.015.04.122.2303.2491", fonte: "1.500.0000000", naturezaDespesa: "Indenizações e Restituições Trabalhistas", elemento: "3.1.90", subelemento: "94" },
    { reduzido: "785", funcional: "02.015.04.122.2303.2491", fonte: "1.500.0000000", naturezaDespesa: "Ressarcimento de Despesas de Pessoal Requisitado", elemento: "3.1.90", subelemento: "96" },
    { reduzido: "786", funcional: "02.015.04.122.2303.2491", fonte: "1.500.0000000", naturezaDespesa: "Obrigações Patronais", elemento: "3.1.91", subelemento: "13" },
    { reduzido: "787", funcional: "02.015.04.122.2303.2491", fonte: "1.500.0000000", naturezaDespesa: "Outros Serviços de Terceiros - Pessoa Física", elemento: "3.3.90", subelemento: "36" },
    { reduzido: "788", funcional: "02.015.04.122.2303.2491", fonte: "1.500.0000000", naturezaDespesa: "Obrigações Tributárias e Contributivas", elemento: "3.3.91", subelemento: "47" },
    { reduzido: "750", funcional: "02.015.04.128.2303.1066", fonte: "1.500.0000000", naturezaDespesa: "Diárias - Civil", elemento: "3.3.90", subelemento: "14" },
    { reduzido: "751", funcional: "02.015.04.128.2303.1066", fonte: "1.500.0000000", naturezaDespesa: "Material de Consumo", elemento: "3.3.90", subelemento: "30" },
    { reduzido: "752", funcional: "02.015.04.128.2303.1066", fonte: "1.500.0000000", naturezaDespesa: "Passagens e Despesas com Locomoção", elemento: "3.3.90", subelemento: "33" },
    { reduzido: "753", funcional: "02.015.04.128.2303.1066", fonte: "1.500.0000000", naturezaDespesa: "Outros Serviços de Terceiros - Pessoa Física", elemento: "3.3.90", subelemento: "36" },
    { reduzido: "754", funcional: "02.015.04.128.2303.1066", fonte: "1.500.0000000", naturezaDespesa: "Outros Serviços de Terceiros - Pessoa Jurídica", elemento: "3.3.90", subelemento: "39" },
    { reduzido: "749", funcional: "02.015.04.128.2303.1587", fonte: "1.500.0000000", naturezaDespesa: "Outros Serviços de Terceiros - Pessoa Jurídica", elemento: "3.3.90", subelemento: "39" },
    { reduzido: "748", funcional: "02.015.10.331.2303.2236", fonte: "1.500.0000000", naturezaDespesa: "Obrigações Tributárias e Contributivas", elemento: "3.3.91", subelemento: "47" },
    { reduzido: "742", funcional: "02.015.11.334.2303.2016", fonte: "1.500.0000000", naturezaDespesa: "Contribuições", elemento: "3.3.50", subelemento: "41" },
    { reduzido: "743", funcional: "02.015.11.334.2303.2016", fonte: "1.500.0000000", naturezaDespesa: "Material de Consumo", elemento: "3.3.90", subelemento: "30" },
    { reduzido: "744", funcional: "02.015.11.334.2303.2016", fonte: "1.500.0000000", naturezaDespesa: "Premiações Culturais, Artísticas, Científicas, Desportivas e Outras", elemento: "3.3.90", subelemento: "31" },
    { reduzido: "745", funcional: "02.015.11.334.2303.2016", fonte: "1.500.0000000", naturezaDespesa: "Outros Serviços de Terceiros - Pessoa Jurídica", elemento: "3.3.90", subelemento: "39" },
    { reduzido: "746", funcional: "02.015.11.334.2303.2016", fonte: "1.500.0000000", naturezaDespesa: "Serviços de Tecnologia da Informação e Comunicação - Pessoa Jurídica", elemento: "3.3.90", subelemento: "40" },
    { reduzido: "747", funcional: "02.015.11.334.2303.2016", fonte: "1.500.0000000", naturezaDespesa: "Outros Auxílios Financeiros a Pessoas Físicas", elemento: "3.3.90", subelemento: "48" },
    { reduzido: "740", funcional: "02.015.19.126.2303.2040", fonte: "1.500.0000000", naturezaDespesa: "Material de Consumo", elemento: "3.3.90", subelemento: "30" },
    { reduzido: "741", funcional: "02.015.19.126.2303.2040", fonte: "1.500.0000000", naturezaDespesa: "Serviços de Tecnologia da Informação e Comunicação - Pessoa Jurídica", elemento: "3.3.90", subelemento: "40" },
    { reduzido: "739", funcional: "02.015.19.364.2303.1736", fonte: "1.500.0000000", naturezaDespesa: "Contribuições", elemento: "3.3.70", subelemento: "41" },
    { reduzido: "738", funcional: "02.015.25.752.2303.2128", fonte: "1.751.0000000", naturezaDespesa: "Outros Serviços de Terceiros - Pessoa Jurídica", elemento: "3.3.90", subelemento: "39" },
  ]).onConflictDoNothing();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Erro no seed:", err);
  process.exit(1);
});