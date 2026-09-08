/** PAPER-011 — pure functions, no DOM. */

export const TEMPLATE_IDS = ["nie", "rent", "return"];

export const DEFAULT_TEMPLATES = [
  {
    id: "nie",
    zh: "NIE",
    es: "NIE",
    en: "NIE",
    blurb_zh: "外国人身份号码。预约当天按这张单子装袋子，少一样就白跑。",
    blurb_es: "Número de Identidad de Extranjero. Lleva esto el día de la cita — si falta una cosa, vuelves otro día.",
    blurb_en: "Spanish foreigner ID number. Pack this bag for the appointment.",
    items: [
      {
        id: "nie-passport",
        zh: "护照原件 + 资料页复印件",
        es: "Pasaporte original y fotocopia de la hoja de datos",
        hint_zh: "有效期建议 6 个月以上，复印件多带一张。",
        hint_es: "Vigencia recomendada > 6 meses; lleva una copia extra.",
      },
      {
        id: "nie-ex15",
        zh: "EX-15 申请表（填好、签字）",
        es: "Modelo EX-15 cumplimentado y firmado",
        hint_zh: "extranjeros.inclusion.gob.es 下载。用正楷，别漏签字。",
        hint_es: "Descarga en extranjeros.inclusion.gob.es. En mayúsculas, no olvides la firma.",
      },
      {
        id: "nie-790",
        zh: "790-012 费率已缴证明",
        es: "Justificante de tasa 790 código 012",
        hint_zh: "银行、合作储蓄所或 sede.policia.gob.es 缴。带盖章收据。",
        hint_es: "Pago en banco, caja o sede.policia.gob.es. Lleva el justificante sellado.",
      },
      {
        id: "nie-cita",
        zh: "预约回执 cita previa",
        es: "Justificante de cita previa",
        hint_zh: "手机里的确认短信/邮件也打印一份。",
        hint_es: "Imprime también el SMS o el correo de confirmación.",
      },
      {
        id: "nie-motivo",
        zh: "申请事由证明",
        es: "Justificante del motivo de la solicitud",
        hint_zh: "工作 offer、录取通知、购房、开公司、欧盟亲属……和你填的事由一致。",
        hint_es: "Oferta de trabajo, matrícula, compraventa, empresa, familiar UE… alineado con el EX-15.",
      },
      {
        id: "nie-padron",
        zh: "住址证明 / empadronamiento（如要求）",
        es: "Empadronamiento o prueba de domicilio (si lo piden)",
        hint_zh: "有的警局要，有的不要。打印带上不亏。",
        hint_es: "Algunas comisarías lo piden, otras no. Llevarlo no estorba.",
      },
      {
        id: "nie-photo",
        zh: "证件照（办 TIE 时必备，办 NIE 号码备用）",
        es: "Fotografía reciente (imprescindible para TIE; de reserva para NIE)",
        hint_zh: "白底，西班牙证件照规格。",
        hint_es: "Fondo blanco, tamaño carné español.",
      },
      {
        id: "nie-ue",
        zh: "欧盟公民登记 / 亲属文件（如适用）",
        es: "Certificado de registro UE / documentos de familiar (si aplica)",
        hint_zh: "和欧盟公民在一起才需要。结婚证要翻译 + 海牙认证。",
        hint_es: "Solo si eres familiar de ciudadano UE. Matrimonio: traducción jurada + apostilla.",
      },
      {
        id: "nie-translate",
        zh: "非西语文件：宣誓翻译 + 海牙认证",
        es: "Documentos no españoles: traducción jurada y apostilla",
        hint_zh: "中国公证书先过外交部/外办，再去西班牙使领馆或海牙。",
        hint_es: "Los papeles chinos suelen ir por notaría → cancelería → apostilla o legalización.",
      },
      {
        id: "nie-copy",
        zh: "全套复印件再留一份在家",
        es: "Una copia completa de todo el expediente en casa",
        hint_zh: "窗口有时要收走复印件。原件看完会还。",
        hint_es: "A veces se quedan las copias. Los originales se devuelven.",
      },
    ],
  },
  {
    id: "rent",
    zh: "租房合同材料",
    es: "Papeles del contrato de alquiler",
    en: "Rental contract papers",
    blurb_zh: "马德里租房，中介和房东要的那一叠。缺工资单就没有合同。",
    blurb_es: "Lo que piden agencias y caseros en Madrid. Sin nóminas, no hay contrato.",
    blurb_en: "What Madrid agencies and landlords ask for.",
    items: [
      {
        id: "rent-id",
        zh: "护照 / NIE / TIE 原件及复印件",
        es: "Pasaporte / NIE / TIE original y copia",
        hint_zh: "还没 NIE 就先用护照 + 申请回执。",
        hint_es: "Si aún no tienes NIE, pasaporte + resguardo de solicitud.",
      },
      {
        id: "rent-work",
        zh: "工作合同 Contrato de trabajo",
        es: "Contrato de trabajo",
        hint_zh: "试用期、期限、薪资页都要。",
        hint_es: "Incluye periodo de prueba, duración y salario.",
      },
      {
        id: "rent-payslip",
        zh: "近 3 个月工资单 Nóminas",
        es: "Nóminas de los últimos 3 meses",
        hint_zh: "PDF 打印。自由职业改用发票 + 税单。",
        hint_es: "Imprime los PDF. Autónomos: facturas + modelo fiscal.",
      },
      {
        id: "rent-bank",
        zh: "银行流水 Extracto (约 3 个月)",
        es: "Extracto bancario (~3 meses)",
        hint_zh: "工资入账那几行要能对上工资单。",
        hint_es: "Que se vea la nómina entrando en la cuenta.",
      },
      {
        id: "rent-vida",
        zh: "社保工作寿命 Vida laboral 或 IRPF",
        es: "Informe de vida laboral o IRPF",
        hint_zh: "sede.seg-social.gob.es 可下载。",
        hint_es: "Se descarga en sede.seg-social.gob.es.",
      },
      {
        id: "rent-aval",
        zh: "担保：银行 aval 或担保人文件",
        es: "Aval bancario o documentación del avalista",
        hint_zh: "收入不够时几乎必要。担保人同样准备工资单。",
        hint_es: "Casi obligatorio si el sueldo no llega. El avalista aporta nóminas también.",
      },
      {
        id: "rent-fianza",
        zh: "押金 Fianza（通常 1 个月，走 Comunidad 托管）",
        es: "Fianza (normalmente 1 mes, depósito autonómico)",
        hint_zh: "马德里另加 1 个月预付很常见。问清转哪张账号。",
        hint_es: "En Madrid suele pedirse 1 mes extra por adelantado. Confirma la cuenta.",
      },
      {
        id: "rent-agency",
        zh: "中介费收据（如走中介）",
        es: "Honorarios de agencia (si aplica)",
        hint_zh: "2023 后住房法：常由房东承担，但仍有人向租客收。写进合同。",
        hint_es: "Ley de vivienda: suele pagar el casero, pero aún lo cobran al inquilino. Que figure en el contrato.",
      },
      {
        id: "rent-energy",
        zh: "能源证书 Certificado energético（房东提供）",
        es: "Certificado energético (lo aporta el casero)",
        hint_zh: "没这个，合同不完整。",
        hint_es: "Sin esto el contrato queda cojo.",
      },
      {
        id: "rent-inventario",
        zh: "入住物品清单 Inventario + 照片",
        es: "Inventario de entrada + fotos",
        hint_zh: "墙面、家电、电表拍照，签字各留一份。",
        hint_es: "Fotos de paredes, electrodomésticos y contadores. Una copia cada uno.",
      },
      {
        id: "rent-insurance",
        zh: "家庭保险 Seguro de hogar（如合同要求）",
        es: "Seguro de hogar (si el contrato lo exige)",
        hint_zh: "不少合同写租客必须买责任险。",
        hint_es: "Muchos contratos exigen un seguro de responsabilidad civil.",
      },
      {
        id: "rent-padron",
        zh: "签完去办 empadronamiento",
        es: "Empadronarse después de firmar",
        hint_zh: "合同 + 房东授权或账单。NIE、医疗、学校都要它。",
        hint_es: "Contrato + autorización del casero o recibos. Lo piden para NIE, salud y colegio.",
      },
    ],
  },
  {
    id: "return",
    zh: "回国材料",
    es: "Papeles para volver a China",
    en: "Papers for returning to China",
    blurb_zh: "从西班牙收拾回国：证件、税务、学历、行李。打印勾，箱子边也能用。",
    blurb_es: "Cerrar España y volver a China: papeles, impuestos, títulos, maletas. Se puede marcar en papel.",
    blurb_en: "Closing out Spain and going back to China.",
    items: [
      {
        id: "ret-passport",
        zh: "护照（有效期）+ 中国身份证",
        es: "Pasaporte vigente + DNI chino",
        hint_zh: "护照剩不到 6 个月先去使馆延期。",
        hint_es: "Si quedan < 6 meses, renuévalo en el consulado.",
      },
      {
        id: "ret-ticket",
        zh: "机票行程单（含回程/单程）",
        es: "Itinerario del vuelo",
        hint_zh: "值机页、行李额截图一并打印。",
        hint_es: "Imprime también el check-in y la franquicia de equipaje.",
      },
      {
        id: "ret-tie",
        zh: "居留卡 TIE / 签证页",
        es: "TIE / visado",
        hint_zh: "回国后如需再入境，看卡上有效期。长期离开考虑是否注销。",
        hint_es: "Mira la caducidad si piensas volver. Una baja larga puede exigir baja de residencia.",
      },
      {
        id: "ret-lease",
        zh: "退租协议、押金返还约定、物品交接",
        es: "Fin de contrato, devolución de fianza, inventario de salida",
        hint_zh: "书面约定到账日。电表、墙面拍照。",
        hint_es: "Fecha de devolución por escrito. Fotos de contadores y paredes.",
      },
      {
        id: "ret-bank",
        zh: "银行账户：换汇 / 销户 / 留给自己的卡",
        es: "Banco: cambio de divisa / baja de cuenta / tarjeta que te quedas",
        hint_zh: "大额换汇提前预约。销户要还欠费、注销 Bizum。",
        hint_es: "El cambio grande se cita. Para baja: deudas a cero y Bizum cerrado.",
      },
      {
        id: "ret-tax",
        zh: "税务：IRPF、非税务居民证明（如需要）",
        es: "Impuestos: IRPF, certificado de no residencia (si aplica)",
        hint_zh: "有工资或房租收入别忘最后一次申报。",
        hint_es: "Si tuviste nómina o alquiler, no te saltes la última declaración.",
      },
      {
        id: "ret-penales",
        zh: "无犯罪证明 Antecedentes penales + 海牙认证",
        es: "Certificado de antecedentes penales + apostilla",
        hint_zh: "回国落户、考公、部分就业会要。sede.mjusticia.gob.es。",
        hint_es: "Lo piden para hukou, oposiciones o algunos empleos. sede.mjusticia.gob.es.",
      },
      {
        id: "ret-degree",
        zh: "学历学位证书、成绩单、翻译与认证",
        es: "Título, expediente, traducción y legalización",
        hint_zh: "留学回国人员：留学服务中心认证另走一条线。",
        hint_es: "Quien vuelve de estudios: homologación CSCSE es otro trámite.",
      },
      {
        id: "ret-apostille",
        zh: "需要带回中国的文件：海牙认证 / 领事认证",
        es: "Papeles para China: apostilla / legalización consular",
        hint_zh: "出生、结婚、无犯罪、学位。先问接收方要哪一种。",
        hint_es: "Nacimiento, matrimonio, penales, título. Pregunta cuál piden.",
      },
      {
        id: "ret-health",
        zh: "疫苗本、体检报告、常用药处方",
        es: "Cartilla de vacunación, analítica, recetas",
        hint_zh: "处方药原包装 + 医嘱，过海关少解释。",
        hint_es: "Medicación en envase original + informe, menos lío en aduana.",
      },
      {
        id: "ret-social",
        zh: "社保 / 医保停缴、公司离职证明",
        es: "Baja en Seguridad Social / tarjeta sanitaria, finiquito",
        hint_zh: "问清最后一次发工资和假期结算。",
        hint_es: "Confirma la última nómina y las vacaciones no disfrutadas.",
      },
      {
        id: "ret-phone",
        zh: "手机合约、网络、订阅销户",
        es: "Baja de móvil, fibra y suscripciones",
        hint_zh: "Movistar/Pepephone 等要提前书面。流媒体一起关。",
        hint_es: "Operadoras piden preaviso por escrito. Cierra también el streaming.",
      },
      {
        id: "ret-hukou",
        zh: "户口本、留学回国人员证明（如适用）",
        es: "Hukou y certificado de retorno de estudios (si aplica)",
        hint_zh: "落地后派出所 / 人社可能要。",
        hint_es: "Puede pedirlo la policía o recursos humanos al llegar.",
      },
      {
        id: "ret-luggage",
        zh: "行李与禁运：电池、食品、现金申报",
        es: "Equipaje: baterías, comida, declaración de efectivo",
        hint_zh: "充电宝上飞机、现金超额申报。列一张贴箱子上。",
        hint_es: "Power banks en cabina; efectivo por encima del umbral se declara.",
      },
    ],
  },
];

export function getTemplate(id) {
  return DEFAULT_TEMPLATES.find((t) => t.id === id) || DEFAULT_TEMPLATES[0];
}

export function mergeTemplate(template, saved) {
  const checked = (saved && saved.checked) || {};
  const custom = Array.isArray(saved && saved.custom) ? saved.custom : [];
  const items = (template.items || []).map((it) => ({
    ...it,
    custom: false,
    checked: !!checked[it.id],
  }));
  for (const c of custom) {
    if (!c || !c.id) continue;
    const label = String(c.zh || c.es || c.label || "").slice(0, 120);
    items.push({
      id: String(c.id),
      zh: String(c.zh || label).slice(0, 120),
      es: String(c.es || label).slice(0, 120),
      hint_zh: "",
      hint_es: "",
      custom: true,
      checked: !!checked[c.id],
    });
  }
  return items;
}

export function checklistProgress(items) {
  const list = Array.isArray(items) ? items : [];
  const total = list.length;
  const done = list.filter((i) => !!i.checked).length;
  return {
    total,
    done,
    left: total - done,
    pct: total ? Math.round((done / total) * 100) : 0,
  };
}

export function remainingItems(items) {
  return (Array.isArray(items) ? items : []).filter((i) => !i.checked);
}

export function printLines(items, lang) {
  return (Array.isArray(items) ? items : []).map((it) => {
    const mark = it.checked ? "[x]" : "[ ]";
    const primary = lang === "es" ? it.es : it.zh;
    const secondary = lang === "es" ? it.zh : it.es;
    return `${mark} ${primary}${secondary && secondary !== primary ? " / " + secondary : ""}`;
  });
}
