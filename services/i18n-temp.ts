import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth, updateUserLanguage } from './firebase';

export type Language = 'PT' | 'EN' | 'ES';

export type I18nKeys = {
  // Home / Geral
  heroTitle: string;
  freePlan: string;
  plan: string;
  uploadTitle: string;
  uploadSub: string;
  accessCamera: string;
  uploadFile: string;
  voiceTitle: string;
  voiceSub: string;
  voiceBtn: string;
  faceTitle: string;
  faceSub: string;
  faceBtn: string;
  sentryTitle: string;
  sentrySub: string;
  sentryBtnOn: string;
  sentryBtnOff: string;
  explorePlans: string;
  verdict: string;
  riskScore: string;
  evidence: string;
  verificationSources: string;
  newAnalysis: string;
  share: string;
  back: string;
  language: string;
  operationLang: string;
  premiumOnly: string;
  // Scan / Relatório
  reportTitle: string;
  reportForensicDetailed: string;
  reportMetadata: string;
  reportProtocolId: string;
  reportMediaType: string;
  reportConfidence: string;
  reportFileName: string;
  reportError: string;
  downloadPdf: string;
  generating: string;
  reportErrorBtn: string;
  probableAI: string;
  probableReal: string;
  feedbackSent: string;
  feedbackThanks: string;
  reportAnalysis: string;
  reportAnalysisDesc: string;
  falsePositive: string;
  falsePositiveDesc: string;
  falseNegative: string;
  falseNegativeDesc: string;
  otherReason: string;
  otherReasonDesc: string;
  additionalContext: string;
  cancel: string;
  send: string;
  sending: string;
  close: string;
  // Limit Modal
  limitModalTitle: string;
  limitModalDesc: string;
  limitModalPremium: string;
  subscribeNow: string;
  later: string;
  upgradeAd1: string;
  upgradeAd2: string;
  upgradeAd3: string;
  upgradeAd4: string;
  upgradeAd5: string;
  upgradeAdCta: string;
  upgradeAdCreditsCta: string;
  // Splash / Entry
  splashSubtitle: string;
  splashInit: string;
  splashReady: string;
  enterTerminal: string;
  entryChoiceTitle: string;
  entryChoiceSubtitle: string;
  entryChoiceUser: string;
  entryChoiceUserDesc: string;
  entryChoiceCorporate: string;
  entryChoiceCorporateDesc: string;
  entryChoiceFooter: string;
  // Profile
  userCenter: string;
  loggedAsGuest: string;
  verifiedUser: string;
  statusActive: string;
  credits: string;
  monthly: string;
  syncAccount: string;
  syncing: string;
  operationalMgmt: string;
  myPlan: string;
  termsOfUse: string;
  loginOrRegister: string;
  adminOffline: string;
  comingSoon: string;
  switchAccount: string;
  criticalZone: string;
  endSession: string;
  deleteAccount: string;
  returnToTerminal: string;
  systemLanguage: string;
  selectTranslation: string;
  langChangesInstant: string;
  endSessionConfirm: string;
  endSessionDesc: string;
  yesLogout: string;
  deleteConfirm: string;
  deleteConfirmDesc: string;
  typeExcluir: string;
  confirmDelete: string;
  deleting: string;
  restrictedAccess: string;
  newAgent: string;
  fillRequired: string;
  passwordMin: string;
  passwordsMismatch: string;
  operationalEmail: string;
  cryptoKey: string;
  confirmKey: string;
  enterTerminalBtn: string;
  registerAgent: string;
  syncViaGoogle: string;
  emailAlreadyRegistered: string;
  invalidCredentials: string;
  registerGmailOnly: string;
  invalidEmail: string;
  authTechFail: string;
  forgotPassword: string;
  backToLogin: string;
  resetPasswordTitle: string;
  resetPasswordDesc: string;
  resetPasswordSend: string;
  resetPasswordSuccess: string;
  resetPasswordFail: string;
  resetEmailNotFound: string;
  googleHandshakeFail: string;
  loginWithFacebook: string;
  loginWithGitHub: string;
  loginWithApple: string;
  facebookAuthFail: string;
  githubAuthFail: string;
  appleAuthFail: string;
  noAccess: string;
  hasCredentials: string;
  backToProfile: string;
  planActive: string;
  available: string;
  upgradeOperational: string;
  manageSubscription: string;
  migrateToBusiness: string;
  annualCycle: string;
  monthlyCycle: string;
  activeProtocols: string;
  operationalDetails: string;
  autoRenewal: string;
  batchLimit: string;
  batchLimitBusiness: string;
  batchLimitAdvanced: string;
  batchLimitFree: string;
  networkPriority: string;
  purchaseHistory: string;
  noPurchases: string;
  purchaseTypeCredits: string;
  purchaseTypeSubscription: string;
  accessDatabaseIA: string;
  // Info / Planos
  monthlySubscription: string;
  autoRecurrence: string;
  levelFree: string;
  levelAdvanced: string;
  levelBusiness: string;
  mostPopular: string;
  idealCasual: string;
  fullProtection: string;
  maxSecurity: string;
  signMonthly: string;
  requestMonthly: string;
  upgradeComplete: string;
  planNameLivre: string;
  planNameAdvanced: string;
  planNameBusiness: string;
  badgeCorp: string;
  featureFreeScans: string;
  featureImageAnalysis: string;
  featureFaceScan: string;
  featureLimitedChat: string;
  featureSimpleReport: string;
  feature80Scans: string;
  featureAntiRomance: string;
  featureDaiPrecision: string;
  featurePrioritySupport: string;
  featureModeratedChatVideos: string;
  feature200Scans: string;
  featureJudicialReports: string;
  featurePdfReports: string;
  featureBusinessPanel: string;
  featureDatabase: string;
  featureBlockchainAudit: string;
  featureScansPerUpload: string;
  scansLabel: string;
  creditsSection: string;
  creditsPackLabel: string;
  creditsDesc: string;
  buyNow: string;
  monthlySubscriptions: string;
  subscriptionsDesc: string;
  advancedCredits: string;
  businessCredits: string;
  flexibleUse: string;
  creditPriority: string;
  secureCheckout: string;
  encryptedProcessing: string;
  mercadoPago: string;
  mercadoPagoDesc: string;
  mpFeatures: string;
  paypalGlobal: string;
  paypalDesc: string;
  ppFeatures: string;
  totalSecurity: string;
  ssl256: string;
  noDataRetention: string;
  activation60s: string;
  // Checkout
  checkoutTitle: string;
  finishPurchase: string;
  realityScanForensics: string;
  ready: string;
  choosePaymentMethod: string;
  mpPaymentOptions: string;
  paypalPaymentOptions: string;
  encryptedTransactionMsg: string;
  acceptCardsPixPaypal: string;
  dataSecurity: string;
  endToEndEncryption: string;
  realVerdict: string;
  authenticitySeal: string;
  serverOfflineTitle: string;
  serverOfflineDesc: string;
  simulateSuccessDemo: string;
  loginToUpgrade: string;
  serverError: string;
  simulateSuccess: string;
  payWithMp: string;
  // Payment Success
  subscriptionConfirmed: string;
  defenseInfra: string;
  planLabel: string;
  protocol: string;
  issued: string;
  backToDefense: string;
  // Home scan
  forensicCore: string;
  startForensicScan: string;
  forensicCamera: string;
  forensicUpload: string;
  businessMode: string;
  feedScam: string;
  feedScamDesc: string;
  faceScam: string;
  faceScamDesc: string;
  voiceScam: string;
  voiceScamDesc: string;
  activateMonitor: string;
  activateShort: string;
  deactivateMonitor: string;
  changeNetwork: string;
  networkOpenedHint: string;
  startRecon: string;
  uploadAudio: string;
  romanticDefense: string;
  romanticScam: string;
  // Sentry HUD
  howToUse: string;
  sentryInstructions: string;
  sentryActive: string;
  analyzing: string;
  analysisComplete: string;
  readyToAnalyze: string;
  processingCapture: string;
  clickNewAnalysis: string;
  aiDetected: string;
  integrityOk: string;
  analysesInSession: string;
  alertAiContent: string;
  standbyMode: string;
  operational: string;
  analyzeAgain: string;
  newAnalysisBtn: string;
  sentryReport: string;
  sentryNetworkPickerTitle: string;
  sentryNetworkPickerSub: string;
  sentryNetworkPickerHint: string;
  sentryGuideTitle: string;
  sentryStep1: string;
  sentryStep2: string;
  sentryStep3: string;
  sentryStep2Confirm: string;
  sentryConfirmAndShare: string;
  sentryBackToStep1: string;
  indicatorsDetailTitle: string;
  sentryNetworkInstagram: string;
  sentryNetworkFacebook: string;
  sentryNetworkTiktok: string;
  sentryNetworkTwitter: string;
  sentryNetworkYoutube: string;
  generatedAt: string;
  totalAnalyses: string;
  risk: string;
  // Payment received
  paymentReceived: string;
  loginToSeePlan: string;
  enter: string;
  // Plans (features - arrays handled separately)
  planCommunity: string;
  planAdvanced: string;
  planBusiness: string;
  planCurrent: string;
  subscribeAdvanced: string;
  requestBusiness: string;
  // Business / Database / Header
  terminalBusiness: string;
  businessPanelSubtitle: string;
  databaseTitle: string;
  databaseSubtitle: string;
  backToTerminal: string;
  database: string;
  exportCsv: string;
  totalProtocols: string;
  aiAlertsStored: string;
  aiDetectedCard: string;
  positiveScans: string;
  avgRisk: string;
  avgOfAlerts: string;
  searchPlaceholderDb: string;
  noAiAlerts: string;
  runAnalysisPrompt: string;
  syncSecure: string;
  endBusinessSession: string;
  pdfReportEnabled: string;
  runAnalysisForPdf: string;
  goToAnalysis: string;
  activatePdfReport: string;
  pdfReportSub: string;
  requestJudicial: string;
  judicialSub: string;
  blockchainAudit: string;
  blockchainSub: string;
  statusEnabled: string;
  statusStandby: string;
  defenseDivision: string;
  sessionProtected: string;
  painelBusiness: string;
  painelAdmin: string;
  // Corporate Portal (Elevare Tech AI)
  corpPortalTitle: string;
  corpPortalSubtitle: string;
  corpSwitchMode: string;
  corpKnowledge: string;
  corpKnowledgeDesc: string;
  corpChat: string;
  corpChatDesc: string;
  corpAutomations: string;
  corpAutomationsDesc: string;
  corpDataAnalysis: string;
  corpDataAnalysisDesc: string;
  corpSupport: string;
  corpSupportDesc: string;
  corpSystemRequests: string;
  corpSystemRequestsDesc: string;
  corpReports: string;
  corpReportsDesc: string;
  corpComingSoon: string;
  cancelBtn: string;
  enterTerminalBtnShort: string;
  registerAgentBtn: string;
  planDetailsDesc: string;
  returnToDefense: string;
  // Database table & modal
  dateTime: string;
  file: string;
  type: string;
  source: string;
  details: string;
  noName: string;
  forensicRecord: string;
  riskLevel: string;
  technicalAnalysis: string;
  evidenceLabel: string;
  videoLinkLabel: string;
  noDetailedDesc: string;
  exportTxt: string;
  closeBtn: string;
  atTime: string;
  // Chat
  chatOnline: string;
  chatPlaceholder: string;
  chatAttach: string;
  chatVoiceStart: string;
  chatVoiceStop: string;
  chatVoicePlay: string;
  chatAnalyzing: string;
  chatTyping: string;
  chatDownloadPdf: string;
  chatAgentAdvanced: string;
  chatAgentBusiness: string;
  chatLangLabel: string;
  // Reasoning Agent
  reasoningAgentWelcome: string;
  reasoningAgentModalTitle: string;
  reasoningAgentModalDesc: string;
  reasoningAgentModalBenefits: string;
  // Chat Menu
  chatMenuTitle: string;
  chatMenuReasoning: string;
  chatMenuReasoningDesc: string;
  chatMenuReasoningLimit: string;
  chatMenuMedia: string;
  chatMenuMediaDesc: string;
  chatMenuMediaLimit: string;
  chatMenuCorporate: string;
  chatMenuCorporateDesc: string;
  chatMenuCorporateLimit: string;
  corporateAgentWelcome: string;
  corporateKnowledgeTitle: string;
  corporateKnowledgeSubtitle: string;
  corporateKnowledgePlaceholder: string;
  corporateKnowledgeSave: string;
  corporateKnowledgeError: string;
  chatMediaWelcome: string;
  chatMediaWelcomeFree: string;
  chatMediaPlaceholder: string;
  // Corporate
  chatMenuCorporate: string;
  chatMenuCorporateDesc: string;
  chatMenuCorporateLimit: string;
  corporateAgentWelcome: string;
  corporateKnowledgeTitle: string;
  corporateKnowledgeDesc: string;
  corporateKnowledgePlaceholder: string;
  corporateKnowledgeSave: string;
  corporateKnowledgeError: string;
  // Corporate
  corporateKnowledgeTitle: string;
  corporateKnowledgeDesc: string;
  corporateKnowledgePlaceholder: string;
  corporateAgentMenu: string;
  corporateAgentMenuDesc: string;
  corporateAgentWelcome: string;
  save: string;
  // API / Dev
  apiForDevelopers: string;
  apiForDevelopersDesc: string;
  apiPlansInfo: string;
  apiKeySecure: string;
  apiConsumptionLogs: string;
  devPanel: string;
  viewApiPlans: string;
  newBadge: string;
  apiPlansTitle: string;
  apiPlansSubtitle: string;
  apiBasic: string;
  apiPro: string;
  apiEnterprise: string;
  apiCreateKey: string;
  apiCopy: string;
  apiRegenerate: string;
  apiCurrentPlan: string;
  apiUpgrade: string;
  apiDashboard: string;
  apiKeys: string;
  apiUsage: string;
  apiBilling: string;
  apiDocs: string;
  apiTester: string;
  apiLogs: string;
  apiSettings: string;
  apiTestApi: string;
  apiRequestsMonth: string;
  apiLimitToday: string;
  apiPlanLimit: string;
  apiSecurity: string;
  apiDevPanelTitle: string;
  apiLoginToManage: string;
  apiRequestsMonthShort: string;
  apiCostEst: string;
  apiAccountStatus: string;
  apiActive: string;
  apiBlocked: string;
  apiUsageLast7: string;
  apiCopyNow: string;
  apiCopied: string;
  apiInactive: string;
  apiNoKeyYet: string;
  apiMostPopular: string;
  apiSubscribeMp: string;
  apiSubscribePayPal: string;
  apiCheckout: string;
  apiPaymentInfo: string;
  apiCreateKeyHint: string;
  apiRequestsUnit: string;
  apiPerMonth: string;
  apiUnlimited: string;
  apiModelMostUsed: string;
  // API Plans page
  apiLoginToSubscribe: string;
  apiErrorPayPal: string;
  apiErrorPaymentLink: string;
  apiErrorPayment: string;
  apiErrorCheckout: string;
  apiBasicF1: string;
  apiBasicF2: string;
  apiBasicF3: string;
  apiBasicF4: string;
  apiProF1: string;
  apiProF2: string;
  apiProF3: string;
  apiProF4: string;
  apiEntF1: string;
  apiEntF2: string;
  apiEntF3: string;
  apiEntF4: string;
  // Dev Panel extra
  apiSignIn: string;
  apiLoadFail: string;
  apiRegenerateConfirm: string;
  apiCreateKeyError: string;
  apiRegenerateError: string;
  apiTestError: string;
  apiUsageConsumption: string;
  apiRequestsPerDay: string;
  apiToday: string;
  apiTotalPeriod: string;
  apiEndpointMostUsed: string;
  apiUsageChart: string;
  apiDays7: string;
  apiDays30: string;
  apiMonthlyLimit: string;
  apiRenewal: string;
  apiValue: string;
  apiUpgradePlan: string;
  apiBaseUrl: string;
  apiEndpoints: string;
  apiExampleFetch: string;
  apiEnterPrompt: string;
  apiTestApiPlaceholder: string;
  apiResponse: string;
  apiLogsTitle: string;
  apiNoRequestsYet: string;
  apiDate: string;
  apiEndpoint: string;
  apiModel: string;
  apiStatus: string;
  apiLimitPerMin: string;
  apiRegenerateHint: string;
  apiGoToKeys: string;
  apiEmail: string;
  apiAccountHint: string;
  apiPlanFree: string;
  apiPlanBasicPrice: string;
  apiPlanProPrice: string;
  apiPlanEnterprisePrice: string;
}

const translations: Record<Language, I18nKeys> = {
  PT: {
    heroTitle: "O primeiro identificador de IA completo. Criado para sua proteção",
    freePlan: "PLANO GRÁTIS",
    plan: "PLANO",
    uploadTitle: "Enviar para Análise",
    uploadSub: "Escolha como deseja realizar o escaneamento forense",
    accessCamera: "Acessar Câmera",
    uploadFile: "Subir Arquivo",
    voiceTitle: "AI Voice Forensic",
    voiceSub: "Detecte vozes clonadas por inteligência artificial com análise de harmônicos neurais.",
    voiceBtn: "Analisar Áudio Criptografado",
    faceTitle: "FaceScan Forensic",
    faceSub: "Valide identidades reais e detecte deepfakes faciais em tempo real através de varredura biométrica.",
    faceBtn: "Analisar foto via câmera",
    sentryTitle: "Sentry Shield (Beta)",
    sentrySub: "Proteção ativa enquanto você navega. Escaneia seu feed em busca de deepfakes.",
    sentryBtnOn: "Desativar Escudo Ativo",
    sentryBtnOff: "Ativar Monitoramento de Tela",
    explorePlans: "Explorar Planos",
    verdict: "Veredito",
    riskScore: "Índice de Risco / IA",
    evidence: "EVIDÊNCIAS COLETADAS",
    verificationSources: "FONTES DE VERIFICAÇÃO",
    newAnalysis: "nova análise",
    share: "compartilhar análise",
    back: "voltar",
    language: "Idioma",
    operationLang: "Idioma de Operação",
    premiumOnly: "APENAS ADVANCED / BUSINESS",
    reportTitle: "Relatório de Autenticidade",
    reportForensicDetailed: "RELATÓRIO FORENSE DETALHADO",
    reportMetadata: "INFORMAÇÕES DO PROTOCOLO",
    reportProtocolId: "ID do Protocolo",
    reportMediaType: "Tipo de Mídia",
    reportConfidence: "Confiança",
    reportFileName: "Arquivo",
    reportError: "REPORTAR ERRO",
    downloadPdf: "BAIXAR PDF",
    generating: "GERANDO...",
    reportErrorBtn: "REPORTAR ERRO",
    probableAI: "PROVÁVEL IA",
    probableReal: "PROVÁVEL REAL",
    feedbackSent: "Feedback Enviado",
    feedbackThanks: "Obrigado por nos ajudar a melhorar a precisão do RealityScan.",
    reportAnalysis: "Reportar Análise",
    reportAnalysisDesc: "A análise está incorreta? Conte-nos o que houve.",
    falsePositive: "Falso Positivo",
    falsePositiveDesc: "A mídia é real, mas foi marcada como IA.",
    falseNegative: "Falso Negativo",
    falseNegativeDesc: "A mídia é IA, mas foi marcada como Real.",
    otherReason: "Outro Motivo",
    otherReasonDesc: "Outras inconsistências ou sugestões.",
    additionalContext: "Contexto Adicional (Opcional)",
    cancel: "Cancelar",
    send: "Enviar",
    sending: "Enviando...",
    close: "Fechar",
    limitModalTitle: "Você usou seus 3 scans gratuitos",
    limitModalDesc: "Proteja-se de golpes e deepfakes 24/7. Análises ilimitadas, suporte prioritário e relatórios forenses. A partir de R$ 21,90/mês — menos que um café por dia.",
    limitModalPremium: "Desbloqueie este recurso e proteja quem você ama. Planos a partir de R$ 21,90/mês com análise de vídeos, áudios e muito mais.",
    subscribeNow: "QUERO ME PROTEGER",
    later: "Depois",
    upgradeAd1: "Golpes e deepfakes aumentam 40% ao ano. Assine e proteja-se com análises ilimitadas.",
    upgradeAd2: "Não deixe um golpe pegar você. Planos a partir de R$ 21,90/mês — menos que um café.",
    upgradeAd3: "80+ scans por mês, relatórios forenses e suporte prioritário. Assine agora.",
    upgradeAd4: "Compre créditos avulsos e continue analisando sem compromisso mensal.",
    upgradeAd5: "Proteja quem você ama. Detecte IA, fraudes e manipulação antes que seja tarde.",
    upgradeAdCta: "Assinar plano",
    upgradeAdCreditsCta: "Comprar créditos",
    splashSubtitle: "Sistema de Defesa Biometria & IA",
    splashInit: "inicializando protocolos_",
    splashReady: "SISTEMA PRONTO PARA OPERAÇÃO",
    enterTerminal: "ENTRAR NO TERMINAL",
    entryChoiceTitle: "Como deseja entrar?",
    entryChoiceSubtitle: "Escolha o modo de acesso",
    entryChoiceUser: "Usuário comum",
    entryChoiceUserDesc: "Análise forense, detecção de IA, Sentry, chat e scans pessoais.",
    entryChoiceCorporate: "Empresa",
    entryChoiceCorporateDesc: "IA corporativa, base de conhecimento, automações, relatórios e suporte dedicado.",
    entryChoiceFooter: "Você pode trocar o modo a qualquer momento",
    userCenter: "CENTRAL DO USUÁRIO",
    loggedAsGuest: "logado como visitante",
    verifiedUser: "Usuário Verificado",
    statusActive: "Status: Ativo",
    credits: "Créditos",
    monthly: "Mensal",
    syncAccount: "Sincronizar Conta",
    syncing: "Sincronizando...",
    operationalMgmt: "Gerenciamento Operacional",
    myPlan: "Meu plano",
    termsOfUse: "Termos de uso",
    loginOrRegister: "Entrar ou Cadastrar",
    adminOffline: "Admin indisponível",
    comingSoon: "Em breve",
    switchAccount: "Mudar de conta",
    criticalZone: "Zona Crítica",
    endSession: "Encerrar sessão",
    deleteAccount: "Excluir conta",
    returnToTerminal: "Retornar ao Terminal de Defesa",
    systemLanguage: "Idioma do Sistema",
    selectTranslation: "Selecione a tradução da interface",
    langChangesInstant: "As alterações de idioma são aplicadas instantaneamente em todos os seus dispositivos.",
    endSessionConfirm: "ENCERRAR SESSÃO?",
    endSessionDesc: "Você será desconectado do terminal. Seus dados permanecerão salvos para o próximo acesso.",
    yesLogout: "SIM, SAIR DO TERMINAL",
    deleteConfirm: "EXCLUIR CONTA?",
    deleteConfirmDesc: "Ação irreversível. Digite EXCLUIR para confirmar:",
    typeExcluir: "Digite aqui...",
    confirmDelete: "CONFIRMAR EXCLUSÃO TOTAL",
    deleting: "ELIMINANDO DADOS...",
    restrictedAccess: "ACESSO RESTRITO",
    newAgent: "NOVO AGENTE",
    fillRequired: "Preencha todos os campos obrigatórios.",
    passwordMin: "A senha deve ter no mínimo 8 caracteres.",
    passwordsMismatch: "As senhas não coincidem.",
    operationalEmail: "E-MAIL OPERACIONAL",
    cryptoKey: "CHAVE DE CRIPTOGRAFIA",
    confirmKey: "CONFIRMAR CHAVE",
    enterTerminalBtn: "ENTRAR NO TERMINAL",
    registerAgent: "REGISTRAR AGENTE",
    syncViaGoogle: "login com google",
    emailAlreadyRegistered: "Este e-mail já possui um registro.",
    invalidCredentials: "Credenciais inválidas.",
    registerGmailOnly: "Cadastro com e-mail só é permitido para contas Gmail (@gmail.com). Use um e-mail Gmail ou faça login com Google.",
    invalidEmail: "E-mail inválido.",
    authTechFail: "Falha na autenticação técnica.",
    forgotPassword: "Esqueceu a senha?",
    backToLogin: "Voltar ao login",
    resetPasswordTitle: "Redefinir Senha",
    resetPasswordDesc: "Informe seu e-mail e enviaremos um link para redefinir sua senha.",
    resetPasswordSend: "Enviar link de redefinição",
    resetPasswordSuccess: "E-mail enviado! Verifique sua caixa de entrada e siga as instruções.",
    resetPasswordFail: "Falha ao enviar e-mail de redefinição. Tente novamente.",
    resetEmailNotFound: "Nenhuma conta encontrada com este e-mail.",
    googleHandshakeFail: "Falha no handshake via Google.",
    loginWithFacebook: "Entrar com Facebook",
    loginWithGitHub: "Entrar com GitHub",
    loginWithApple: "Entrar com Apple",
    facebookAuthFail: "Falha no login com Facebook.",
    githubAuthFail: "Falha no login com GitHub.",
    appleAuthFail: "Falha no login com Apple.",
    noAccess: "Não possui acesso? Cadastre novo agente",
    hasCredentials: "JÁ POSSUI CREDENCIAIS? RETORNAR AO LOGIN",
    backToProfile: "VOLTAR AO PERFIL",
    planActive: "PLANO ATIVO",
    available: "DISPONÍVEL",
    upgradeOperational: "Fazer Upgrade Operacional",
    manageSubscription: "Gerenciar Assinatura",
    migrateToBusiness: "Migrar para Business",
    annualCycle: "CICLO ANUAL",
    monthlyCycle: "CICLO MENSAL",
    activeProtocols: "Protocolos Ativos",
    operationalDetails: "Detalhes Operacionais",
    autoRenewal: "Renovação Automática",
    batchLimit: "Limite de Lote",
    batchLimitBusiness: "Até 20 arquivos simultâneos",
    batchLimitAdvanced: "Análise Única Sequencial",
    batchLimitFree: "3 Scans Diários",
    networkPriority: "Prioridade de Rede",
    purchaseHistory: "Histórico de Compras",
    noPurchases: "Nenhuma compra registrada",
    purchaseTypeCredits: "Créditos",
    purchaseTypeSubscription: "Assinatura",
    accessDatabaseIA: "Acessar Banco de Dados IA",
    monthlySubscription: "ASSINATURA MENSAL",
    autoRecurrence: "Recorrência automática para proteção contínua",
    levelFree: "NÍVEL 01: PLANO LIVRE",
    levelAdvanced: "NÍVEL 02: ADVANCED",
    levelBusiness: "NÍVEL 03: BUSINESS",
    mostPopular: "MAIS POPULAR",
    idealCasual: "Ideal para usuários casuais e verificações rápidas.",
    fullProtection: "Proteção forense completa para indivíduos e profissionais.",
    maxSecurity: "Segurança máxima para empresas e análise em escala.",
    signMonthly: "ASSINAR MENSAL",
    requestMonthly: "SOLICITAR MENSAL",
    upgradeComplete: "UPGRADE CONCLUÍDO",
    planNameLivre: "Livre",
    planNameAdvanced: "Advanced",
    planNameBusiness: "Business",
    badgeCorp: "CORP",
    featureFreeScans: "3 SCANS GRÁTIS",
    featureImageAnalysis: "ANÁLISE DE IMAGEM",
    featureFaceScan: "FACESCAN",
    featureLimitedChat: "CHAT LIMITADO",
    featureSimpleReport: "RELATÓRIO SIMPLES",
    feature80Scans: "80 SCANS POR MÊS",
    featureAntiRomance: "ANTI-GOLPE ROMÂNTICO",
    featureDaiPrecision: "MÓDULO DAI PRECISION",
    featurePrioritySupport: "SUPORTE PRIORITÁRIO",
    featureModeratedChatVideos: "CHAT MODERADO + (SCAN VÍDEOS E FOTOS)",
    feature200Scans: "200 SCANS POR MÊS",
    featureJudicialReports: "RELATÓRIOS JUDICIAIS",
    featurePdfReports: "RELATÓRIOS EM PDF",
    featureBusinessPanel: "PAINEL BUSINESS",
    featureDatabase: "BANCO DE DADOS",
    featureBlockchainAudit: "AUDITORIA BLOCKCHAIN",
    featureScansPerUpload: "ATÉ 20 SCANS POR UPLOAD + PDF",
    scansLabel: "SCANS",
    creditsSection: "CRÉDITOS AVULSOS",
    creditsPackLabel: "Créditos Avulsos",
    creditsDesc: "Os créditos avulsos são perfeitos para demandas pontuais. Eles não expiram e são consumidos apenas quando você realiza uma análise. Você pode acumular créditos avulsos mesmo tendo uma assinatura ativa.",
    buyNow: "COMPRAR AGORA",
    monthlySubscriptions: "Assinaturas Mensais",
    subscriptionsDesc: "As assinaturas são ideais para quem precisa de proteção contínua. Ao assinar, você recebe uma cota mensal de créditos que são renovados automaticamente a cada 30 dias.",
    advancedCredits: "Advanced: 80 créditos/mês (R$ 0,27 por scan)",
    businessCredits: "Business: 200 créditos/mês (R$ 0,17 por scan)",
    flexibleUse: "Uso flexível sem compromisso mensal",
    creditPriority: "Prioridade: Créditos Mensais → Créditos Avulsos",
    secureCheckout: "Checkout Seguro & Global",
    encryptedProcessing: "Processamento criptografado de ponta a ponta",
    mercadoPago: "Mercado Pago",
    mercadoPagoDesc: "Líder na América Latina. Pagamentos em Real (BRL) com ativação instantânea.",
    mpFeatures: "PIX • Cartão • Boleto • Saldo",
    paypalGlobal: "PayPal Global",
    paypalDesc: "Padrão ouro em pagamentos internacionais. Ideal para usuários fora do Brasil.",
    ppFeatures: "USD • Cartão internacional • Saldo PayPal",
    totalSecurity: "Segurança Total",
    ssl256: "Criptografia SSL 256-bit",
    noDataRetention: "Sem retenção de dados sensíveis",
    activation60s: "Ativação em menos de 60s",
    checkoutTitle: "Checkout",
    finishPurchase: "Finalizar compra",
    realityScanForensics: "REALITYSCAN FORENSICS",
    ready: "Pronto",
    choosePaymentMethod: "Escolha o método de pagamento",
    mpPaymentOptions: "PIX, Cartão, Boleto",
    paypalPaymentOptions: "Cartão, Saldo PayPal (USD)",
    encryptedTransactionMsg: "Sua transação é processada em ambiente criptografado. Aceitamos Mercado Pago (BRL) e PayPal (USD).",
    acceptCardsPixPaypal: "Aceitamos cartões, PIX e PayPal",
    dataSecurity: "Segurança de dados",
    endToEndEncryption: "Criptografia de ponta a ponta",
    realVerdict: "Veredito Real",
    authenticitySeal: "Selo de autenticidade RealityScan",
    serverOfflineTitle: "Servidor Local Offline",
    serverOfflineDesc: "O seu arquivo server.js não está rodando neste ambiente de visualização online. Para testar o fluxo agora, use o modo de simulação abaixo:",
    simulateSuccessDemo: "Simular Sucesso (Modo Demo)",
    loginToUpgrade: "Por favor, faça login com sua conta Google para realizar o upgrade.",
    serverError: "Falha ao conectar com o servidor.",
    simulateSuccess: "Simular Sucesso",
    payWithMp: "Pagar com Mercado Pago",
    subscriptionConfirmed: "Assinatura Confirmada",
    defenseInfra: "Infraestrutura de Defesa Ativa",
    planLabel: "Plano",
    protocol: "Protocolo",
    issued: "Emissão",
    backToDefense: "Retornar à Defesa",
    forensicCore: "REALITYSCAN FORENSIC CORE",
    startForensicScan: "envie arquivos para analise",
    forensicCamera: "CÂMERA FORENSE",
    forensicUpload: "UPLOAD FORENSE",
    businessMode: "BUSINESS FORENSIC MODE",
    feedScam: "FeedScam",
    feedScamDesc: "Monitoramento de tela em tempo real para redes sociais.",
    faceScam: "FaceScam",
    faceScamDesc: "Validação biométrica facial e busca por duplicatas digitais.",
    voiceScam: "VoiceScam",
    voiceScamDesc: "Detecte clones de voz neurais e manipulações de áudio.",
    activateMonitor: "Ativar Monitor",
    activateShort: "Ativar",
    deactivateMonitor: "Desativar Monitor",
    changeNetwork: "Trocar rede",
    networkOpenedHint: "Rede aberta. Clique em Ativar Monitor para compartilhar.",
    startRecon: "Iniciar Recon",
    uploadAudio: "Subir Áudio",
    romanticDefense: "Defesa Emocional On",
    romanticScam: "Anti-golpe Romântico",
    howToUse: "Como usar",
    sentryInstructions: "Vá à aba do feed, pause no vídeo ou foto que deseja analisar e clique em Nova análise. Alertas serão emitidos ao detectar conteúdo com IA.",
    sentryActive: "SENTRY_ACTIVE",
    analyzing: "ANALISANDO",
    analysisComplete: "ANÁLISE_CONCLUÍDA",
    readyToAnalyze: "PRONTO_PARA_ANALISAR",
    processingCapture: "Processando captura...",
    clickNewAnalysis: "Clique em Nova análise",
    aiDetected: "Conteúdo com IA detectado",
    integrityOk: "Integridade OK",
    analysesInSession: "análise(s) nesta sessão",
    alertAiContent: "Alerta: Conteúdo com IA detectado",
    standbyMode: "Standby_Mode",
    operational: "Operational",
    analyzeAgain: "Analisar novamente",
    newAnalysisBtn: "Nova análise",
    sentryReport: "Relatório Sentry - RealityScan",
    sentryNetworkPickerTitle: "Monitor de Feed",
    sentryNetworkPickerSub: "Escolha a rede social",
    sentryNetworkPickerHint: "A rede abrirá em nova aba. Compartilhe essa aba para analisar.",
    sentryGuideTitle: "Como funciona",
    sentryStep1: "Escolha a rede acima — ela abrirá em nova aba.",
    sentryStep2: "Quando o navegador pedir, selecione a ABA da rede social no diálogo.",
    sentryStep3: "Vá ao feed, pause no vídeo/foto e clique em Nova análise no miniHUD.",
    sentryStep2Confirm: "Volte ao app e clique em Confirmar e compartilhar. O Mini HUD abrirá em janela flutuante e o navegador pedirá para escolher a aba da rede social.",
    sentryConfirmAndShare: "Confirmar e compartilhar",
    sentryBackToStep1: "Voltar",
    indicatorsDetailTitle: "Indicadores forenses detalhados",
    sentryNetworkInstagram: "Instagram",
    sentryNetworkFacebook: "Facebook",
    sentryNetworkTiktok: "TikTok",
    sentryNetworkTwitter: "X (Twitter)",
    sentryNetworkYoutube: "YouTube",
    generatedAt: "Gerado em",
    totalAnalyses: "Total de análises",
    risk: "Risco",
    paymentReceived: "Pagamento recebido! Faça login para ver seu plano atualizado.",
    loginToSeePlan: "Faça login para ver seu plano atualizado.",
    enter: "Entrar",
    planCommunity: "Livre",
    planAdvanced: "Advanced",
    planBusiness: "Business",
    planCurrent: "Plano Atual",
    subscribeAdvanced: "Assinar Advanced",
    requestBusiness: "Solicitar Business",
    terminalBusiness: "TERMINAL BUSINESS",
    businessPanelSubtitle: "Painel de controle avançado para operações de alta escala e conformidade legal.",
    databaseTitle: "DATABASE",
    databaseSubtitle: "Repositório de escaneamentos positivos para IA",
    backToTerminal: "Voltar ao Terminal",
    database: "Database",
    exportCsv: "Exportar CSV",
    totalProtocols: "Total de Protocolos",
    aiAlertsStored: "Alertas IA armazenados",
    aiDetectedCard: "IA Detectada",
    positiveScans: "Escaneamentos positivos",
    avgRisk: "Risco Médio",
    avgOfAlerts: "Média dos alertas",
    searchPlaceholderDb: "Buscar por arquivo, veredito ou data...",
    noAiAlerts: "Nenhum alerta IA armazenado",
    runAnalysisPrompt: "Execute análises e detecte conteúdo com IA para ver os registros aqui.",
    syncSecure: "Sincronizando com Servidor Seguro...",
    endBusinessSession: "Encerrar Sessão Business",
    pdfReportEnabled: "Relatório PDF ativado",
    runAnalysisForPdf: "Execute uma análise para gerar laudos técnicos em PDF.",
    goToAnalysis: "Ir para análise",
    activatePdfReport: "Ativar relatório PDF",
    pdfReportSub: "Exportação automatizada de laudos técnicos escritos",
    requestJudicial: "Solicitar relatórios judiciais",
    judicialSub: "Documentação pericial para fins de direito",
    blockchainAudit: "Auditoria blockchain",
    blockchainSub: "Registro imutável em rede descentralizada",
    statusEnabled: "// STATUS: ENABLED",
    statusStandby: "// STATUS: STANDBY",
    defenseDivision: "RealityScan Defense Division",
    sessionProtected: "Sessão protegida por criptografia assimétrica",
    painelBusiness: "Painel Business",
    painelAdmin: "Painel Admin",
    corpPortalTitle: "Elevare Tech AI",
    corpPortalSubtitle: "IA Corporativa · Automação · Conhecimento",
    corpSwitchMode: "Trocar para modo usuário",
    corpKnowledge: "Base de Conhecimento",
    corpKnowledgeDesc: "Documentos, manuais e dados que treinam a IA da empresa",
    corpChat: "Chat IA Interno",
    corpChatDesc: "IA treinada para responder à equipe",
    corpAutomations: "Automações",
    corpAutomationsDesc: "Fluxos e integrações automatizadas",
    corpDataAnalysis: "Análise de Dados",
    corpDataAnalysisDesc: "Dashboards e relatórios inteligentes",
    corpSupport: "Suporte IA",
    corpSupportDesc: "Atendimento técnico com IA",
    corpSystemRequests: "Pedidos de Sistema",
    corpSystemRequestsDesc: "Solicite automações e sistemas sob demanda",
    corpReports: "Relatórios",
    corpReportsDesc: "Relatórios automáticos e exportações",
    corpComingSoon: "Em breve",
    cancelBtn: "Cancelar",
    enterTerminalBtnShort: "ENTRAR NO TERMINAL",
    registerAgentBtn: "REGISTRAR AGENTE",
    planDetailsDesc: "Planos Advanced e Business oferecem recursos estendidos e maior prioridade de processamento. Assinaturas são renovadas automaticamente via Mercado Pago.",
    returnToDefense: "Retornar ao Terminal de Defesa",
    dateTime: "Data / Hora",
    file: "Arquivo",
    type: "Tipo",
    source: "Fonte",
    details: "Detalhes",
    noName: "Sem Nome",
    forensicRecord: "Registro Forense",
    riskLevel: "Nível de Risco",
    technicalAnalysis: "Análise Técnica",
    evidenceLabel: "Evidências",
    videoLinkLabel: "Link do vídeo",
    noDetailedDesc: "Nenhuma descrição detalhada disponível.",
    exportTxt: "Exportar TXT",
    closeBtn: "Fechar",
    atTime: "às",
    chatOnline: "IA NGT online. Envie texto, prints ou vídeos.",
    chatPlaceholder: "Descreva sua dúvida ou peça uma opinião...",
    chatAttach: "Anexar arquivo",
    chatVoiceStart: "Falar",
    chatVoiceStop: "Parar",
    chatVoicePlay: "Ouvir resposta",
    chatAnalyzing: "Analisando",
    chatTyping: "Digitando...",
    chatDownloadPdf: "Baixar Relatório PDF",
    chatAgentAdvanced: "Advanced",
    chatAgentBusiness: "Business",
    chatLangLabel: "Idioma",
    reasoningAgentWelcome: "Agente de raciocínio NGT. Converse, debata e peça opiniões. Se você está no plano FREE, tem apenas uma sessão. Apenas texto e voz.",
    reasoningAgentModalTitle: "Agente de Raciocínio NGT",
    reasoningAgentModalDesc: "Converse com um especialista em golpes e fraudes digitais. Debata ideias, peça opiniões e valide suspeitas em tempo real. Assine e tenha acesso ilimitado — a partir de R$ 26,90/mês.",
    reasoningAgentModalBenefits: "✓ Conversas ilimitadas com IA especializada\n✓ Debates e pareceres em tempo real\n✓ Modos Advanced e Business\n✓ Proteção completa contra golpes",
    chatMenuTitle: "Escolha o modo",
    chatMenuReasoning: "Agente de Raciocínio",
    chatMenuReasoningDesc: "Conversas, debates e opiniões. Apenas texto e áudio.",
    chatMenuReasoningLimit: "1 sessão grátis/dia. Assine para mais.",
    chatMenuMedia: "Análise de Mídia",
    chatMenuMediaDesc: "Vídeos, áudios e arquivos. Desconta créditos.",
    chatMenuMediaLimit: "1 sessão grátis/dia. Assine para mais.",
    chatMenuCorporate: "Agente Corporativo",
    chatMenuCorporateDesc: "IA treinada com a base de conhecimento da sua empresa. Plano Business.",
    chatMenuCorporateLimit: "Exclusivo plano Business.",
    corporateAgentWelcome: "Agente Corporativo NGT. Converse com a IA que conhece sua empresa. Use a base de conhecimento configurada em Perfil > Base Corporativa.",
    corporateKnowledgeTitle: "Base de Conhecimento Corporativo",
    corporateKnowledgeSubtitle: "Texto, processos e dados que a IA usará para responder. Exclusivo Business.",
    corporateKnowledgePlaceholder: "Cole aqui documentos, políticas, processos, FAQ ou qualquer texto que a IA deve usar para responder às perguntas da equipe...",
    corporateKnowledgeSave: "Salvar",
    corporateKnowledgeError: "Erro ao carregar ou salvar.",
    chatMediaWelcome: "Análise de Mídia NGT. Envie vídeos, áudios ou arquivos para análise forense. Cada análise desconta créditos.",
    chatMediaWelcomeFree: "Você tem 1 análise grátis nesta sessão. Envie um arquivo ou texto para experimentar a análise forense NGT.",
    chatMediaPlaceholder: "Descreva a suspeita ou anexe arquivo...",
    corporateKnowledgeDesc: "IA privada da empresa — dados, processos, políticas.",
    corporateAgentMenu: "Agente Corporativo",
    corporateAgentMenuDesc: "IA treinada na base de conhecimento da sua empresa. Business.",
    save: "Salvar",
    apiForDevelopers: "API para Desenvolvedores",
    apiForDevelopersDesc: "Integre detecção de IA, análise forense e geração de texto no seu app. Endpoints REST com autenticação por API Key.",
    apiPlansInfo: "Planos Free (50 req/dia), Basic, Pro e Enterprise.",
    apiKeySecure: "API Key segura (sk_live_...)",
    apiConsumptionLogs: "Controle de consumo e logs",
    devPanel: "Painel Dev",
    viewApiPlans: "Ver planos API",
    newBadge: "NOVO",
    apiPlansTitle: "Planos API para Desenvolvedores",
    apiPlansSubtitle: "Escale sua integração com RealityScan. Endpoints REST para detecção de IA, análise forense e geração de texto.",
    apiBasic: "Basic",
    apiPro: "Pro",
    apiEnterprise: "Enterprise",
    apiCreateKey: "Criar API Key",
    apiCopy: "Copiar",
    apiRegenerate: "Regenerar",
    apiCurrentPlan: "Plano atual",
    apiUpgrade: "Fazer upgrade",
    apiDashboard: "Dashboard",
    apiKeys: "API Keys",
    apiUsage: "Uso",
    apiBilling: "Plano & Billing",
    apiDocs: "Documentação",
    apiTester: "Testador",
    apiLogs: "Logs",
    apiSettings: "Configurações",
    apiTestApi: "Testar API",
    apiRequestsMonth: "Requisições do mês",
    apiLimitToday: "Consumo hoje",
    apiPlanLimit: "Limite do plano",
    apiSecurity: "Segurança",
    apiDevPanelTitle: "Painel Dev API",
    apiLoginToManage: "Faça login para criar e gerenciar sua API Key.",
    apiRequestsMonthShort: "Requisições/mês",
    apiCostEst: "Custo est.",
    apiAccountStatus: "Status da conta",
    apiActive: "Ativa",
    apiBlocked: "Bloqueada",
    apiUsageLast7: "Uso últimos 7 dias",
    apiCopyNow: "Copie agora — a chave completa não será exibida novamente.",
    apiCopied: "Copiado!",
    apiInactive: "Inativa",
    apiNoKeyYet: "Você ainda não possui uma API key.",
    apiMostPopular: "Mais popular",
    apiSubscribeMp: "Assinar com Mercado Pago",
    apiSubscribePayPal: "Assinar com PayPal",
    apiCheckout: "Ir para Checkout",
    apiPaymentInfo: "Pagamento seguro via Mercado Pago ou PayPal. Após aprovação, seu plano é ativado em até 1 minuto.",
    apiCreateKeyHint: "Crie sua API Key no Painel Dev antes de assinar — o upgrade será aplicado à sua chave existente.",
    apiRequestsUnit: "requisições",
    apiPerMonth: "/mês",
    apiUnlimited: "Ilimitado",
    apiModelMostUsed: "Modelo mais usado",
    apiLoginToSubscribe: "Faça login para assinar um plano de API.",
    apiErrorPayPal: "Erro ao criar pagamento PayPal",
    apiErrorPaymentLink: "Link de checkout PayPal não recebido.",
    apiErrorPayment: "Erro ao gerar link de pagamento.",
    apiErrorCheckout: "Erro ao iniciar checkout.",
    apiBasicF1: "5.000 requisições/mês",
    apiBasicF2: "API Key dedicada",
    apiBasicF3: "Logs de uso",
    apiBasicF4: "Suporte por email",
    apiProF1: "20.000 requisições/mês",
    apiProF2: "Prioridade na fila",
    apiProF3: "Todos os endpoints",
    apiProF4: "Suporte prioritário",
    apiEntF1: "Requisições ilimitadas",
    apiEntF2: "SLA garantido",
    apiEntF3: "Suporte dedicado",
    apiEntF4: "Integração customizada",
    apiSignIn: "Entrar",
    apiLoadFail: "Falha ao carregar dados.",
    apiRegenerateConfirm: "Regenerar invalidará a chave atual. Continuar?",
    apiCreateKeyError: "Erro ao criar chave.",
    apiRegenerateError: "Erro ao regenerar.",
    apiTestError: "Erro ao testar.",
    apiUsageConsumption: "Uso e consumo",
    apiRequestsPerDay: "Requisições por dia",
    apiToday: "hoje",
    apiTotalPeriod: "Total do período",
    apiEndpointMostUsed: "Endpoint mais usado",
    apiUsageChart: "Gráfico de uso",
    apiDays7: "7 dias",
    apiDays30: "30 dias",
    apiMonthlyLimit: "Limite mensal",
    apiRenewal: "Renovação",
    apiValue: "Valor",
    apiUpgradePlan: "Upgrade plano",
    apiBaseUrl: "Base URL",
    apiEndpoints: "Endpoints",
    apiExampleFetch: "Exemplo (fetch)",
    apiEnterPrompt: "Digite um prompt",
    apiTestApiPlaceholder: "Ex: Gere um resumo sobre inteligência artificial",
    apiResponse: "Resposta",
    apiLogsTitle: "Logs de requisições",
    apiNoRequestsYet: "Nenhuma requisição ainda.",
    apiDate: "Data",
    apiEndpoint: "Endpoint",
    apiModel: "Modelo",
    apiStatus: "Status",
    apiLimitPerMin: "Limite por minuto",
    apiRegenerateHint: "Para regenerar sua chave (invalida a atual), vá em API Keys.",
    apiGoToKeys: "Ir para API Keys",
    apiEmail: "Email",
    apiAccountHint: "Para excluir conta ou alterar email, utilize o Painel do usuário (Perfil).",
    apiPlanFree: "Grátis",
    apiPlanBasicPrice: "R$ 49,90/mês",
    apiPlanProPrice: "R$ 149,90/mês",
    apiPlanEnterprisePrice: "R$ 499,90/mês",
  },
  EN: {
    heroTitle: "The first complete AI identifier. Created for your protection",
    freePlan: "FREE PLAN",
    plan: "PLAN",
    uploadTitle: "Send for Analysis",
    uploadSub: "Choose how you want to perform the forensic scan",
    accessCamera: "Access Camera",
    uploadFile: "Upload File",
    voiceTitle: "AI Voice Forensic",
    voiceSub: "Detect AI-cloned voices with neural harmonic analysis and vocoder artifacts.",
    voiceBtn: "Analyze Encrypted Audio",
    faceTitle: "FaceScan Forensic",
    faceSub: "Validate real identities and detect facial deepfakes in real-time through advanced scanning.",
    faceBtn: "Analyze photo via camera",
    sentryTitle: "Sentry Shield (Beta)",
    sentrySub: "Active protection while you browse. Scans your feed for deepfakes and fraud.",
    sentryBtnOn: "Deactivate Active Shield",
    sentryBtnOff: "Enable Screen Monitoring",
    explorePlans: "Explore Plans",
    verdict: "Verdict",
    riskScore: "Risk Score / AI",
    evidence: "COLLECTED EVIDENCE",
    verificationSources: "VERIFICATION SOURCES",
    newAnalysis: "new analysis",
    share: "share analysis",
    back: "back",
    language: "Language",
    operationLang: "Operation Language",
    premiumOnly: "ADVANCED / BUSINESS ONLY",
    reportTitle: "Authenticity Report",
    reportForensicDetailed: "DETAILED FORENSIC REPORT",
    reportMetadata: "PROTOCOL INFORMATION",
    reportProtocolId: "Protocol ID",
    reportMediaType: "Media Type",
    reportConfidence: "Confidence",
    reportFileName: "File",
    reportError: "REPORT ERROR",
    downloadPdf: "DOWNLOAD PDF",
    generating: "GENERATING...",
    reportErrorBtn: "REPORT ERROR",
    probableAI: "PROBABLE AI",
    probableReal: "PROBABLE REAL",
    feedbackSent: "Feedback Sent",
    feedbackThanks: "Thank you for helping us improve RealityScan accuracy.",
    reportAnalysis: "Report Analysis",
    reportAnalysisDesc: "Is the analysis incorrect? Tell us what happened.",
    falsePositive: "False Positive",
    falsePositiveDesc: "Media is real but was marked as AI.",
    falseNegative: "False Negative",
    falseNegativeDesc: "Media is AI but was marked as Real.",
    otherReason: "Other Reason",
    otherReasonDesc: "Other inconsistencies or suggestions.",
    additionalContext: "Additional Context (Optional)",
    cancel: "Cancel",
    send: "Send",
    sending: "Sending...",
    close: "Close",
    limitModalTitle: "You've used your 3 free scans",
    limitModalDesc: "Protect yourself from scams and deepfakes 24/7. Unlimited analyses, priority support and forensic reports. From $3.99/month — less than a coffee a day.",
    limitModalPremium: "Unlock this feature and protect those you love. Plans from $3.99/month with video, audio analysis and more.",
    subscribeNow: "I WANT TO PROTECT MYSELF",
    later: "Later",
    upgradeAd1: "Scams and deepfakes increase 40% per year. Subscribe and protect yourself with unlimited analyses.",
    upgradeAd2: "Don't let a scam catch you. Plans from $3.99/month — less than a coffee.",
    upgradeAd3: "80+ scans per month, forensic reports and priority support. Subscribe now.",
    upgradeAd4: "Buy credit packs and keep analyzing with no monthly commitment.",
    upgradeAd5: "Protect those you love. Detect AI, fraud and manipulation before it's too late.",
    upgradeAdCta: "Subscribe to plan",
    upgradeAdCreditsCta: "Buy credits",
    splashSubtitle: "Biometrics & AI Defense System",
    splashInit: "initializing protocols_",
    splashReady: "SYSTEM READY FOR OPERATION",
    enterTerminal: "ENTER TERMINAL",
    entryChoiceTitle: "How do you want to enter?",
    entryChoiceSubtitle: "Choose your access mode",
    entryChoiceUser: "Individual user",
    entryChoiceUserDesc: "Forensic analysis, AI detection, Sentry, chat and personal scans.",
    entryChoiceCorporate: "Enterprise",
    entryChoiceCorporateDesc: "Corporate AI, knowledge base, automations, reports and dedicated support.",
    entryChoiceFooter: "You can switch mode at any time",
    userCenter: "USER CENTER",
    loggedAsGuest: "logged in as guest",
    verifiedUser: "Verified User",
    statusActive: "Status: Active",
    credits: "Credits",
    monthly: "Monthly",
    syncAccount: "Sync Account",
    syncing: "Syncing...",
    operationalMgmt: "Operational Management",
    myPlan: "My plan",
    termsOfUse: "Terms of use",
    loginOrRegister: "Login or Register",
    adminOffline: "Admin unavailable",
    comingSoon: "Coming soon",
    switchAccount: "Switch account",
    criticalZone: "Critical Zone",
    endSession: "End session",
    deleteAccount: "Delete account",
    returnToTerminal: "Return to Defense Terminal",
    systemLanguage: "System Language",
    selectTranslation: "Select interface translation",
    langChangesInstant: "Language changes are applied instantly across all your devices.",
    endSessionConfirm: "END SESSION?",
    endSessionDesc: "You will be disconnected. Your data will remain saved for next access.",
    yesLogout: "YES, LOG OUT",
    deleteConfirm: "DELETE ACCOUNT?",
    deleteConfirmDesc: "Irreversible action. Type DELETE to confirm:",
    typeExcluir: "Type here...",
    confirmDelete: "CONFIRM TOTAL DELETION",
    deleting: "DELETING DATA...",
    restrictedAccess: "RESTRICTED ACCESS",
    newAgent: "NEW AGENT",
    fillRequired: "Fill all required fields.",
    passwordMin: "Password must be at least 8 characters.",
    passwordsMismatch: "Passwords do not match.",
    operationalEmail: "OPERATIONAL EMAIL",
    cryptoKey: "CRYPTOGRAPHY KEY",
    confirmKey: "CONFIRM KEY",
    enterTerminalBtn: "ENTER TERMINAL",
    registerAgent: "REGISTER AGENT",
    syncViaGoogle: "login with Google",
    emailAlreadyRegistered: "This email is already registered.",
    invalidCredentials: "Invalid credentials.",
    registerGmailOnly: "Email registration is only allowed for Gmail accounts (@gmail.com). Use a Gmail address or sign in with Google.",
    invalidEmail: "Invalid email.",
    authTechFail: "Technical authentication failure.",
    forgotPassword: "Forgot password?",
    backToLogin: "Back to login",
    resetPasswordTitle: "Reset Password",
    resetPasswordDesc: "Enter your email and we'll send you a link to reset your password.",
    resetPasswordSend: "Send reset link",
    resetPasswordSuccess: "Email sent! Check your inbox and follow the instructions.",
    resetPasswordFail: "Failed to send reset email. Please try again.",
    resetEmailNotFound: "No account found with this email.",
    googleHandshakeFail: "Google handshake failed.",
    loginWithFacebook: "Sign in with Facebook",
    loginWithGitHub: "Sign in with GitHub",
    loginWithApple: "Sign in with Apple",
    facebookAuthFail: "Facebook sign-in failed.",
    githubAuthFail: "GitHub sign-in failed.",
    appleAuthFail: "Apple sign-in failed.",
    noAccess: "Don't have access? Register new agent",
    hasCredentials: "ALREADY HAVE CREDENTIALS? RETURN TO LOGIN",
    backToProfile: "BACK TO PROFILE",
    planActive: "ACTIVE PLAN",
    available: "AVAILABLE",
    upgradeOperational: "Operational Upgrade",
    manageSubscription: "Manage Subscription",
    migrateToBusiness: "Migrate to Business",
    annualCycle: "ANNUAL CYCLE",
    monthlyCycle: "MONTHLY CYCLE",
    activeProtocols: "Active Protocols",
    operationalDetails: "Operational Details",
    autoRenewal: "Auto Renewal",
    batchLimit: "Batch Limit",
    batchLimitBusiness: "Up to 20 simultaneous files",
    batchLimitAdvanced: "Single Sequential Analysis",
    batchLimitFree: "3 Daily Scans",
    networkPriority: "Network Priority",
    purchaseHistory: "Purchase History",
    noPurchases: "No purchases recorded",
    purchaseTypeCredits: "Credits",
    purchaseTypeSubscription: "Subscription",
    accessDatabaseIA: "Access AI Files Database",
    monthlySubscription: "MONTHLY SUBSCRIPTION",
    autoRecurrence: "Auto recurrence for continuous protection",
    levelFree: "LEVEL 01: FREE PLAN",
    levelAdvanced: "LEVEL 02: ADVANCED",
    levelBusiness: "LEVEL 03: BUSINESS",
    mostPopular: "MOST POPULAR",
    idealCasual: "Ideal for casual users and quick verifications.",
    fullProtection: "Complete forensic protection for individuals and professionals.",
    maxSecurity: "Maximum security for businesses and scale analysis.",
    signMonthly: "SUBSCRIBE MONTHLY",
    requestMonthly: "REQUEST MONTHLY",
    upgradeComplete: "UPGRADE COMPLETE",
    planNameLivre: "Free",
    planNameAdvanced: "Advanced",
    planNameBusiness: "Business",
    badgeCorp: "CORP",
    featureFreeScans: "3 FREE SCANS",
    featureImageAnalysis: "IMAGE ANALYSIS",
    featureFaceScan: "FACESCAN",
    featureLimitedChat: "LIMITED CHAT",
    featureSimpleReport: "SIMPLE REPORT",
    feature80Scans: "80 SCANS PER MONTH",
    featureAntiRomance: "ANTI-ROMANCE SCAM",
    featureDaiPrecision: "DAI PRECISION MODULE",
    featurePrioritySupport: "PRIORITY SUPPORT",
    featureModeratedChatVideos: "MODERATED CHAT + (SCAN VIDEOS AND PHOTOS)",
    feature200Scans: "200 SCANS PER MONTH",
    featureJudicialReports: "JUDICIAL REPORTS",
    featurePdfReports: "PDF REPORTS",
    featureBusinessPanel: "BUSINESS DASHBOARD",
    featureDatabase: "DATABASE",
    featureBlockchainAudit: "BLOCKCHAIN AUDIT",
    featureScansPerUpload: "UP TO 20 SCANS PER UPLOAD + PDF",
    scansLabel: "SCANS",
    creditsSection: "ONE-TIME CREDITS",
    creditsPackLabel: "One-time Credits",
    creditsDesc: "One-time credits are perfect for on-demand use. They never expire and are consumed only when you run an analysis. You can accumulate credits even with an active subscription.",
    buyNow: "BUY NOW",
    monthlySubscriptions: "Monthly Subscriptions",
    subscriptionsDesc: "Subscriptions are ideal for continuous protection. When you subscribe, you receive a monthly credit quota that renews automatically every 30 days.",
    advancedCredits: "Advanced: 80 credits/month ($0.05 per scan)",
    businessCredits: "Business: 200 credits/month ($0.03 per scan)",
    flexibleUse: "Flexible use without monthly commitment",
    creditPriority: "Priority: Monthly → One-time Credits",
    secureCheckout: "Secure & Global Checkout",
    encryptedProcessing: "End-to-end encrypted processing",
    mercadoPago: "Mercado Pago",
    mercadoPagoDesc: "Latin America leader. Payments in BRL with instant activation.",
    mpFeatures: "PIX • Card • Boleto • Balance",
    paypalGlobal: "PayPal Global",
    paypalDesc: "Gold standard in international payments. Ideal for users outside Brazil.",
    ppFeatures: "USD • International card • PayPal balance",
    totalSecurity: "Total Security",
    ssl256: "SSL 256-bit encryption",
    noDataRetention: "No sensitive data retention",
    activation60s: "Activation in under 60s",
    checkoutTitle: "Checkout",
    finishPurchase: "Complete purchase",
    realityScanForensics: "REALITYSCAN FORENSICS",
    ready: "Ready",
    choosePaymentMethod: "Choose payment method",
    mpPaymentOptions: "PIX, Card, Boleto",
    paypalPaymentOptions: "Card, PayPal Balance (USD)",
    encryptedTransactionMsg: "Your transaction is processed in an encrypted environment. We accept Mercado Pago (BRL) and PayPal (USD).",
    acceptCardsPixPaypal: "We accept cards, PIX and PayPal",
    dataSecurity: "Data security",
    endToEndEncryption: "End-to-end encryption",
    realVerdict: "Real Verdict",
    authenticitySeal: "RealityScan authenticity seal",
    serverOfflineTitle: "Local Server Offline",
    serverOfflineDesc: "Your server.js file is not running in this online preview environment. To test the flow now, use the simulation mode below:",
    simulateSuccessDemo: "Simulate Success (Demo Mode)",
    loginToUpgrade: "Please log in with your Google account to upgrade.",
    serverError: "Failed to connect to server.",
    simulateSuccess: "Simulate Success",
    payWithMp: "Pay with Mercado Pago",
    subscriptionConfirmed: "Subscription Confirmed",
    defenseInfra: "Active Defense Infrastructure",
    planLabel: "Plan",
    protocol: "Protocol",
    issued: "Issued",
    backToDefense: "Return to Defense",
    forensicCore: "REALITYSCAN FORENSIC CORE",
    startForensicScan: "send files for analysis",
    forensicCamera: "FORENSIC CAMERA",
    forensicUpload: "FORENSIC UPLOAD",
    businessMode: "BUSINESS FORENSIC MODE",
    feedScam: "FeedScam",
    feedScamDesc: "Real-time screen monitoring for social networks.",
    faceScam: "FaceScam",
    faceScamDesc: "Facial biometric validation and digital duplicate search.",
    voiceScam: "VoiceScam",
    voiceScamDesc: "Detect neural voice clones and audio manipulation.",
    activateMonitor: "Activate Monitor",
    activateShort: "Activate",
    deactivateMonitor: "Deactivate Monitor",
    changeNetwork: "Change network",
    networkOpenedHint: "Network opened. Click Activate Monitor to share.",
    startRecon: "Start Recon",
    uploadAudio: "Upload Audio",
    romanticDefense: "Emotional Defense On",
    romanticScam: "Anti-romantic Scam",
    howToUse: "How to use",
    sentryInstructions: "Go to the feed tab, pause on the video or photo you want to analyze and click New analysis. Alerts will be issued when AI content is detected.",
    sentryActive: "SENTRY_ACTIVE",
    analyzing: "ANALYZING",
    analysisComplete: "ANALYSIS_COMPLETE",
    readyToAnalyze: "READY_TO_ANALYZE",
    processingCapture: "Processing capture...",
    clickNewAnalysis: "Click New analysis",
    aiDetected: "AI content detected",
    integrityOk: "Integrity OK",
    analysesInSession: "analysis(es) in this session",
    alertAiContent: "Alert: AI content detected",
    standbyMode: "Standby_Mode",
    operational: "Operational",
    analyzeAgain: "Analyze again",
    newAnalysisBtn: "New analysis",
    sentryReport: "Sentry Report - RealityScan",
    sentryNetworkPickerTitle: "Feed Monitor",
    sentryNetworkPickerSub: "Choose social network",
    sentryNetworkPickerHint: "The network will open in a new tab. Share that tab to analyze.",
    sentryGuideTitle: "How it works",
    sentryStep1: "Choose the network above — it will open in a new tab.",
    sentryStep2: "When the browser asks, select the TAB of the social network in the dialog.",
    sentryStep3: "Go to the feed, pause on the video/photo and click New analysis in the miniHUD.",
    sentryStep2Confirm: "Return to the app and click Confirm and share. The Mini HUD will open in a floating window and the browser will ask you to select the social network tab.",
    sentryConfirmAndShare: "Confirm and share",
    sentryBackToStep1: "Back",
    indicatorsDetailTitle: "Detailed forensic indicators",
    sentryNetworkInstagram: "Instagram",
    sentryNetworkFacebook: "Facebook",
    sentryNetworkTiktok: "TikTok",
    sentryNetworkTwitter: "X (Twitter)",
    sentryNetworkYoutube: "YouTube",
    generatedAt: "Generated at",
    totalAnalyses: "Total analyses",
    risk: "Risk",
    paymentReceived: "Payment received! Log in to see your updated plan.",
    loginToSeePlan: "Log in to see your updated plan.",
    enter: "Enter",
    planCommunity: "Free",
    planAdvanced: "Advanced",
    planBusiness: "Business",
    planCurrent: "Current Plan",
    subscribeAdvanced: "Subscribe Advanced",
    requestBusiness: "Request Business",
    terminalBusiness: "TERMINAL BUSINESS",
    businessPanelSubtitle: "Advanced control panel for large-scale operations and legal compliance.",
    databaseTitle: "DATABASE",
    databaseSubtitle: "Repository of positive AI scans",
    backToTerminal: "Back to Terminal",
    database: "Database",
    exportCsv: "Export CSV",
    totalProtocols: "Total Protocols",
    aiAlertsStored: "AI alerts stored",
    aiDetectedCard: "AI Detected",
    positiveScans: "Positive scans",
    avgRisk: "Average Risk",
    avgOfAlerts: "Average of alerts",
    searchPlaceholderDb: "Search by file, verdict or date...",
    noAiAlerts: "No AI alerts stored",
    runAnalysisPrompt: "Run analyses and detect AI content to see records here.",
    syncSecure: "Syncing with Secure Server...",
    endBusinessSession: "End Business Session",
    pdfReportEnabled: "PDF report enabled",
    runAnalysisForPdf: "Run an analysis to generate technical reports in PDF.",
    goToAnalysis: "Go to analysis",
    activatePdfReport: "Activate PDF report",
    pdfReportSub: "Automated export of written technical reports",
    requestJudicial: "Request judicial reports",
    judicialSub: "Forensic documentation for legal purposes",
    blockchainAudit: "Blockchain audit",
    blockchainSub: "Immutable record on decentralized network",
    statusEnabled: "// STATUS: ENABLED",
    statusStandby: "// STATUS: STANDBY",
    defenseDivision: "RealityScan Defense Division",
    sessionProtected: "Session protected by asymmetric encryption",
    painelBusiness: "Business Panel",
    painelAdmin: "Admin Panel",
    corpPortalTitle: "Elevare Tech AI",
    corpPortalSubtitle: "Corporate AI · Automation · Knowledge",
    corpSwitchMode: "Switch to user mode",
    corpKnowledge: "Knowledge Base",
    corpKnowledgeDesc: "Documents, manuals and data that train the company AI",
    corpChat: "Internal AI Chat",
    corpChatDesc: "AI trained to answer your team",
    corpAutomations: "Automations",
    corpAutomationsDesc: "Automated flows and integrations",
    corpDataAnalysis: "Data Analysis",
    corpDataAnalysisDesc: "Smart dashboards and reports",
    corpSupport: "AI Support",
    corpSupportDesc: "Technical support with AI",
    corpSystemRequests: "System Requests",
    corpSystemRequestsDesc: "Request automations and custom systems",
    corpReports: "Reports",
    corpReportsDesc: "Automatic reports and exports",
    corpComingSoon: "Coming soon",
    cancelBtn: "Cancel",
    enterTerminalBtnShort: "ENTER TERMINAL",
    registerAgentBtn: "REGISTER AGENT",
    planDetailsDesc: "Advanced and Business plans offer extended features and higher processing priority. Subscriptions renew automatically via Mercado Pago.",
    returnToDefense: "Return to Defense Terminal",
    dateTime: "Date / Time",
    file: "File",
    type: "Type",
    source: "Source",
    details: "Details",
    noName: "No Name",
    forensicRecord: "Forensic Record",
    riskLevel: "Risk Level",
    technicalAnalysis: "Technical Analysis",
    evidenceLabel: "Evidence",
    videoLinkLabel: "Video link",
    noDetailedDesc: "No detailed description available.",
    exportTxt: "Export TXT",
    closeBtn: "Close",
    atTime: "at",
    chatOnline: "NGT AI online. Send text, screenshots or videos.",
    chatPlaceholder: "Describe your question or ask for an opinion...",
    chatAttach: "Attach file",
    chatVoiceStart: "Speak",
    chatVoiceStop: "Stop",
    chatVoicePlay: "Listen to response",
    chatAnalyzing: "Analyzing",
    chatTyping: "Typing...",
    chatDownloadPdf: "Download PDF Report",
    chatAgentAdvanced: "Advanced",
    chatAgentBusiness: "Business",
    chatLangLabel: "Language",
    reasoningAgentWelcome: "NGT Reasoning Agent. Chat, debate and ask for opinions. Text only.",
    reasoningAgentModalTitle: "NGT Reasoning Agent",
    reasoningAgentModalDesc: "Chat with an expert in digital scams and fraud. Debate ideas, ask for opinions and validate suspicions in real time. Subscribe for unlimited access — from $3.99/month.",
    reasoningAgentModalBenefits: "✓ Unlimited conversations with specialized AI\n✓ Real-time debates and expert opinions\n✓ Advanced and Business modes\n✓ Complete protection against scams",
    chatMenuTitle: "Choose mode",
    chatMenuReasoning: "Reasoning Agent",
    chatMenuReasoningDesc: "Conversations, debates and opinions. Text and audio only.",
    chatMenuReasoningLimit: "1 free session/day. Subscribe for more.",
    chatMenuMedia: "Media Analysis",
    chatMenuMediaDesc: "Videos, audio and files. Consumes credits.",
    chatMenuMediaLimit: "1 free session/day. Subscribe for more.",
    chatMenuCorporate: "Corporate Agent",
    chatMenuCorporateDesc: "AI trained on your company knowledge base. Business plan.",
    chatMenuCorporateLimit: "Business plan exclusive.",
    corporateAgentWelcome: "NGT Corporate Agent. Chat with the AI that knows your company. Use the knowledge base configured in Profile > Corporate Base.",
    corporateKnowledgeTitle: "Corporate Knowledge Base",
    corporateKnowledgeSubtitle: "Text, processes and data the AI will use to respond. Business exclusive.",
    corporateKnowledgePlaceholder: "Paste documents, policies, processes, FAQ or any text the AI should use to answer your team's questions...",
    corporateKnowledgeSave: "Save",
    corporateKnowledgeError: "Error loading or saving.",
    chatMediaWelcome: "NGT Media Analysis. Send videos, audio or files for forensic analysis. Each analysis consumes credits.",
    chatMediaWelcomeFree: "You have 1 free analysis in this session. Send a file or text to try NGT forensic analysis.",
    chatMediaPlaceholder: "Describe the suspicion or attach file...",
    corporateKnowledgeDesc: "Company's private AI — data, processes, policies.",
    corporateAgentMenu: "Corporate Agent",
    corporateAgentMenuDesc: "AI trained on your company's knowledge base. Business plan.",
    save: "Save",
    apiForDevelopers: "API for Developers",
    apiForDevelopersDesc: "Integrate AI detection, forensic analysis and text generation into your app. REST endpoints with API Key authentication.",
    apiPlansInfo: "Free plans (50 req/day), Basic, Pro and Enterprise.",
    apiKeySecure: "Secure API Key (sk_live_...)",
    apiConsumptionLogs: "Consumption control and logs",
    devPanel: "Dev Panel",
    viewApiPlans: "View API plans",
    newBadge: "NEW",
    apiPlansTitle: "API Plans for Developers",
    apiPlansSubtitle: "Scale your integration with RealityScan. REST endpoints for AI detection, forensic analysis and text generation.",
    apiBasic: "Basic",
    apiPro: "Pro",
    apiEnterprise: "Enterprise",
    apiCreateKey: "Create API Key",
    apiCopy: "Copy",
    apiRegenerate: "Regenerate",
    apiCurrentPlan: "Current plan",
    apiUpgrade: "Upgrade",
    apiDashboard: "Dashboard",
    apiKeys: "API Keys",
    apiUsage: "Usage",
    apiBilling: "Plan & Billing",
    apiDocs: "Documentation",
    apiTester: "Tester",
    apiLogs: "Logs",
    apiSettings: "Settings",
    apiTestApi: "Test API",
    apiRequestsMonth: "Requests this month",
    apiLimitToday: "Usage today",
    apiPlanLimit: "Plan limit",
    apiSecurity: "Security",
    apiDevPanelTitle: "Dev API Panel",
    apiLoginToManage: "Log in to create and manage your API Key.",
    apiRequestsMonthShort: "Requests/month",
    apiCostEst: "Est. cost",
    apiAccountStatus: "Account status",
    apiActive: "Active",
    apiBlocked: "Blocked",
    apiUsageLast7: "Usage last 7 days",
    apiCopyNow: "Copy now — the full key won't be shown again.",
    apiCopied: "Copied!",
    apiInactive: "Inactive",
    apiNoKeyYet: "You don't have an API key yet.",
    apiMostPopular: "Most popular",
    apiSubscribeMp: "Subscribe with Mercado Pago",
    apiSubscribePayPal: "Subscribe with PayPal",
    apiCheckout: "Go to Checkout",
    apiPaymentInfo: "Secure payment via Mercado Pago or PayPal. Plan activated within 1 minute after approval.",
    apiCreateKeyHint: "Create your API Key in the Dev Panel before subscribing — the upgrade will apply to your existing key.",
    apiRequestsUnit: "requests",
    apiPerMonth: "/month",
    apiUnlimited: "Unlimited",
    apiModelMostUsed: "Most used model",
    apiLoginToSubscribe: "Please log in to subscribe to an API plan.",
    apiErrorPayPal: "Error creating PayPal payment",
    apiErrorPaymentLink: "PayPal checkout link not received.",
    apiErrorPayment: "Error generating payment link.",
    apiErrorCheckout: "Error starting checkout.",
    apiBasicF1: "5,000 requests/month",
    apiBasicF2: "Dedicated API Key",
    apiBasicF3: "Usage logs",
    apiBasicF4: "Email support",
    apiProF1: "20,000 requests/month",
    apiProF2: "Queue priority",
    apiProF3: "All endpoints",
    apiProF4: "Priority support",
    apiEntF1: "Unlimited requests",
    apiEntF2: "Guaranteed SLA",
    apiEntF3: "Dedicated support",
    apiEntF4: "Custom integration",
    apiSignIn: "Sign in",
    apiLoadFail: "Failed to load data.",
    apiRegenerateConfirm: "Regenerating will invalidate the current key. Continue?",
    apiCreateKeyError: "Error creating key.",
    apiRegenerateError: "Error regenerating.",
    apiTestError: "Error testing.",
    apiUsageConsumption: "Usage and consumption",
    apiRequestsPerDay: "Requests per day",
    apiToday: "today",
    apiTotalPeriod: "Total for period",
    apiEndpointMostUsed: "Most used endpoint",
    apiUsageChart: "Usage chart",
    apiDays7: "7 days",
    apiDays30: "30 days",
    apiMonthlyLimit: "Monthly limit",
    apiRenewal: "Renewal",
    apiValue: "Amount",
    apiUpgradePlan: "Upgrade plan",
    apiBaseUrl: "Base URL",
    apiEndpoints: "Endpoints",
    apiExampleFetch: "Example (fetch)",
    apiEnterPrompt: "Enter a prompt",
    apiTestApiPlaceholder: "E.g.: Generate a summary about artificial intelligence",
    apiResponse: "Response",
    apiLogsTitle: "Request logs",
    apiNoRequestsYet: "No requests yet.",
    apiDate: "Date",
    apiEndpoint: "Endpoint",
    apiModel: "Model",
    apiStatus: "Status",
    apiLimitPerMin: "Limit per minute",
    apiRegenerateHint: "To regenerate your key (invalidates current), go to API Keys.",
    apiGoToKeys: "Go to API Keys",
    apiEmail: "Email",
    apiAccountHint: "To delete account or change email, use the user Panel (Profile).",
    apiPlanFree: "Free",
    apiPlanBasicPrice: "$49.90/mo",
    apiPlanProPrice: "$149.90/mo",
    apiPlanEnterprisePrice: "$499.90/mo",
  },
  ES: {
    heroTitle: "El primer identificador de IA completo. Creado para su protección",
    freePlan: "PLAN GRATUITO",
    plan: "PLAN",
    uploadTitle: "Enviar para Análisis",
    uploadSub: "Elija cómo desea realizar el escaneo forense",
    accessCamera: "Acceder Cámara",
    uploadFile: "Subir Archivo",
    voiceTitle: "AI Voice Forensic",
    voiceSub: "Detecte voces clonadas por IA con análisis de armónicos neuronales.",
    voiceBtn: "Analizar Audio Cifrado",
    faceTitle: "FaceScan Forensic",
    faceSub: "Valide identidades reales y detecte deepfakes faciales en tiempo real.",
    faceBtn: "Analizar foto vía cámara",
    sentryTitle: "Sentry Shield (Beta)",
    sentrySub: "Protección activa mientras navegas. Escanea tu feed en busca de deepfakes.",
    sentryBtnOn: "Desactivar Escudo Activo",
    sentryBtnOff: "Activar Monitoreo de Pantalla",
    explorePlans: "Explorar Planes",
    verdict: "Veredicto",
    riskScore: "Índice de Riesgo / IA",
    evidence: "EVIDENCIAS RECOGIDAS",
    verificationSources: "FUENTES DE VERIFICACIÓN",
    newAnalysis: "nuevo análisis",
    share: "compartir análisis",
    back: "volver",
    language: "Idioma",
    operationLang: "Idioma de Operación",
    premiumOnly: "SÓLO ADVANCED / BUSINESS",
    reportTitle: "Informe de Autenticidad",
    reportForensicDetailed: "INFORME FORENSE DETALLADO",
    reportMetadata: "INFORMACIÓN DEL PROTOCOLO",
    reportProtocolId: "ID del Protocolo",
    reportMediaType: "Tipo de Media",
    reportConfidence: "Confianza",
    reportFileName: "Archivo",
    reportError: "REPORTAR ERROR",
    downloadPdf: "DESCARGAR PDF",
    generating: "GENERANDO...",
    reportErrorBtn: "REPORTAR ERROR",
    probableAI: "PROBABLE IA",
    probableReal: "PROBABLE REAL",
    feedbackSent: "Feedback Enviado",
    feedbackThanks: "Gracias por ayudarnos a mejorar la precisión de RealityScan.",
    reportAnalysis: "Reportar Análisis",
    reportAnalysisDesc: "¿El análisis es incorrecto? Cuéntanos qué pasó.",
    falsePositive: "Falso Positivo",
    falsePositiveDesc: "El medio es real pero fue marcado como IA.",
    falseNegative: "Falso Negativo",
    falseNegativeDesc: "El medio es IA pero fue marcado como Real.",
    otherReason: "Otro Motivo",
    otherReasonDesc: "Otras inconsistencias o sugerencias.",
    additionalContext: "Contexto Adicional (Opcional)",
    cancel: "Cancelar",
    send: "Enviar",
    sending: "Enviando...",
    close: "Cerrar",
    limitModalTitle: "Has usado tus 3 escaneos gratuitos",
    limitModalDesc: "Protégete de estafas y deepfakes 24/7. Análisis ilimitados, soporte prioritario e informes forenses. Desde 3,99 USD/mes — menos que un café al día.",
    limitModalPremium: "Desbloquea esta función y protege a quien amas. Planes desde 3,99 USD/mes con análisis de vídeo, audio y más.",
    subscribeNow: "QUIERO PROTEGERME",
    later: "Después",
    upgradeAd1: "Estafas y deepfakes aumentan 40% al año. Suscríbete y protégete con análisis ilimitados.",
    upgradeAd2: "No dejes que una estafa te atrape. Planes desde 3,99 USD/mes — menos que un café.",
    upgradeAd3: "80+ escaneos al mes, informes forenses y soporte prioritario. Suscríbete ahora.",
    upgradeAd4: "Compra créditos y sigue analizando sin compromiso mensual.",
    upgradeAd5: "Protege a quien amas. Detecta IA, fraude y manipulación antes de que sea tarde.",
    upgradeAdCta: "Suscribirse al plan",
    upgradeAdCreditsCta: "Comprar créditos",
    splashSubtitle: "Sistema de Defensa Biometría e IA",
    splashInit: "inicializando protocolos_",
    splashReady: "SISTEMA LISTO PARA OPERACIÓN",
    enterTerminal: "ENTRAR AL TERMINAL",
    entryChoiceTitle: "¿Cómo deseas entrar?",
    entryChoiceSubtitle: "Elige el modo de acceso",
    entryChoiceUser: "Usuario común",
    entryChoiceUserDesc: "Análisis forense, detección de IA, Sentry, chat y escaneos personales.",
    entryChoiceCorporate: "Empresa",
    entryChoiceCorporateDesc: "IA corporativa, base de conocimiento, automatizaciones, informes y soporte dedicado.",
    entryChoiceFooter: "Puedes cambiar el modo en cualquier momento",
    userCenter: "CENTRAL DEL USUARIO",
    loggedAsGuest: "conectado como visitante",
    verifiedUser: "Usuario Verificado",
    statusActive: "Estado: Activo",
    credits: "Créditos",
    monthly: "Mensual",
    syncAccount: "Sincronizar Cuenta",
    syncing: "Sincronizando...",
    operationalMgmt: "Gestión Operativa",
    myPlan: "Mi plan",
    termsOfUse: "Términos de uso",
    loginOrRegister: "Entrar o Registrarse",
    adminOffline: "Admin no disponible",
    comingSoon: "Próximamente",
    switchAccount: "Cambiar cuenta",
    criticalZone: "Zona Crítica",
    endSession: "Cerrar sesión",
    deleteAccount: "Eliminar cuenta",
    returnToTerminal: "Volver al Terminal de Defensa",
    systemLanguage: "Idioma del Sistema",
    selectTranslation: "Seleccione la traducción de la interfaz",
    langChangesInstant: "Los cambios de idioma se aplican al instante en todos tus dispositivos.",
    endSessionConfirm: "¿CERRAR SESIÓN?",
    endSessionDesc: "Serás desconectado. Tus datos permanecerán guardados.",
    yesLogout: "SÍ, SALIR",
    deleteConfirm: "¿ELIMINAR CUENTA?",
    deleteConfirmDesc: "Acción irreversible. Escribe ELIMINAR para confirmar:",
    typeExcluir: "Escribe aquí...",
    confirmDelete: "CONFIRMAR ELIMINACIÓN TOTAL",
    deleting: "ELIMINANDO DATOS...",
    restrictedAccess: "ACCESO RESTRINGIDO",
    newAgent: "NUEVO AGENTE",
    fillRequired: "Complete todos los campos obligatorios.",
    passwordMin: "La contraseña debe tener al menos 8 caracteres.",
    passwordsMismatch: "Las contraseñas no coinciden.",
    operationalEmail: "EMAIL OPERACIONAL",
    cryptoKey: "CLAVE DE CIFRADO",
    confirmKey: "CONFIRMAR CLAVE",
    enterTerminalBtn: "ENTRAR AL TERMINAL",
    registerAgent: "REGISTRAR AGENTE",
    syncViaGoogle: "login con Google",
    emailAlreadyRegistered: "Este correo ya está registrado.",
    invalidCredentials: "Credenciales inválidas.",
    registerGmailOnly: "El registro con correo solo está permitido para cuentas Gmail (@gmail.com). Use un correo Gmail o inicie sesión con Google.",
    invalidEmail: "Correo inválido.",
    authTechFail: "Fallo técnico de autenticación.",
    forgotPassword: "¿Olvidaste tu contraseña?",
    backToLogin: "Volver al inicio de sesión",
    resetPasswordTitle: "Restablecer Contraseña",
    resetPasswordDesc: "Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.",
    resetPasswordSend: "Enviar enlace",
    resetPasswordSuccess: "¡Correo enviado! Revisa tu bandeja y sigue las instrucciones.",
    resetPasswordFail: "Error al enviar el correo. Intenta de nuevo.",
    resetEmailNotFound: "No se encontró ninguna cuenta con este correo.",
    googleHandshakeFail: "Fallo en handshake con Google.",
    loginWithFacebook: "Entrar con Facebook",
    loginWithGitHub: "Entrar con GitHub",
    loginWithApple: "Entrar con Apple",
    facebookAuthFail: "Fallo al iniciar sesión con Facebook.",
    githubAuthFail: "Fallo al iniciar sesión con GitHub.",
    appleAuthFail: "Fallo al iniciar sesión con Apple.",
    noAccess: "¿No tienes acceso? Regístrate",
    hasCredentials: "¿YA TIENES CREDENCIALES? VOLVER AL LOGIN",
    backToProfile: "VOLVER AL PERFIL",
    planActive: "PLAN ACTIVO",
    available: "DISPONIBLE",
    upgradeOperational: "Upgrade Operativo",
    manageSubscription: "Gestionar Suscripción",
    migrateToBusiness: "Migrar a Business",
    annualCycle: "CICLO ANUAL",
    monthlyCycle: "CICLO MENSUAL",
    activeProtocols: "Protocolos Activos",
    operationalDetails: "Detalles Operativos",
    autoRenewal: "Renovación Automática",
    batchLimit: "Límite de Lote",
    batchLimitBusiness: "Hasta 20 archivos simultáneos",
    batchLimitAdvanced: "Análisis Único Secuencial",
    batchLimitFree: "3 Escaneos Diarios",
    networkPriority: "Prioridad de Red",
    purchaseHistory: "Historial de Compras",
    noPurchases: "Sin compras registradas",
    purchaseTypeCredits: "Créditos",
    purchaseTypeSubscription: "Suscripción",
    accessDatabaseIA: "Acceder a Base de Datos IA",
    monthlySubscription: "SUSCRIPCIÓN MENSUAL",
    autoRecurrence: "Recurrencia automática para protección continua",
    levelFree: "NIVEL 01: PLANO GRATUITO",
    levelAdvanced: "NIVEL 02: ADVANCED",
    levelBusiness: "NIVEL 03: BUSINESS",
    mostPopular: "MÁS POPULAR",
    idealCasual: "Ideal para usuarios ocasionales y verificaciones rápidas.",
    fullProtection: "Protección forense completa para individuos y profesionales.",
    maxSecurity: "Máxima seguridad para empresas y análisis a escala.",
    signMonthly: "SUSCRIBIR MENSUAL",
    requestMonthly: "SOLICITAR MENSUAL",
    upgradeComplete: "UPGRADE COMPLETADO",
    planNameLivre: "Gratuito",
    planNameAdvanced: "Advanced",
    planNameBusiness: "Business",
    badgeCorp: "CORP",
    featureFreeScans: "3 SCANS GRATIS",
    featureImageAnalysis: "ANÁLISIS DE IMAGEN",
    featureFaceScan: "FACESCAN",
    featureLimitedChat: "CHAT LIMITADO",
    featureSimpleReport: "INFORME SIMPLE",
    feature80Scans: "80 SCANS POR MES",
    featureAntiRomance: "ANTI-ESTAFA ROMÁNTICA",
    featureDaiPrecision: "MÓDULO DAI PRECISION",
    featurePrioritySupport: "SOPORTE PRIORITARIO",
    featureModeratedChatVideos: "CHAT MODERADO + (SCAN VÍDEOS Y FOTOS)",
    feature200Scans: "200 SCANS POR MES",
    featureJudicialReports: "INFORMES JUDICIALES",
    featurePdfReports: "INFORMES EN PDF",
    featureBusinessPanel: "PANEL BUSINESS",
    featureDatabase: "BASE DE DATOS",
    featureBlockchainAudit: "AUDITORÍA BLOCKCHAIN",
    featureScansPerUpload: "HASTA 20 SCANS POR UPLOAD + PDF",
    scansLabel: "SCANS",
    creditsSection: "CRÉDITOS SUELTOS",
    creditsPackLabel: "Créditos Sueltos",
    creditsDesc: "Los créditos sueltos son perfectos para demandas puntuales. No expiran y se consumen solo al realizar un análisis. Puedes acumular créditos incluso con suscripción activa.",
    buyNow: "COMPRAR AHORA",
    monthlySubscriptions: "Suscripciones Mensuales",
    subscriptionsDesc: "Las suscripciones son ideales para protección continua. Al suscribirte, recibes una cuota mensual de créditos que se renueva automáticamente cada 30 días.",
    advancedCredits: "Advanced: 80 créditos/mes",
    businessCredits: "Business: 200 créditos/mes",
    flexibleUse: "Uso flexible sin compromiso mensual",
    creditPriority: "Prioridad: Mensuales → Sueltos",
    secureCheckout: "Checkout Seguro y Global",
    encryptedProcessing: "Procesamiento cifrado de extremo a extremo",
    mercadoPago: "Mercado Pago",
    mercadoPagoDesc: "Líder en América Latina. Pagos en Real (BRL) con activación instantánea.",
    mpFeatures: "PIX • Tarjeta • Boleto • Saldo",
    paypalGlobal: "PayPal Global",
    paypalDesc: "Estándar de oro en pagos internacionales. Ideal para usuarios fuera de Brasil.",
    ppFeatures: "USD • Tarjeta internacional • Saldo PayPal",
    totalSecurity: "Seguridad Total",
    ssl256: "Cifrado SSL 256-bit",
    noDataRetention: "Sin retención de datos sensibles",
    activation60s: "Activación en menos de 60s",
    checkoutTitle: "Checkout",
    finishPurchase: "Finalizar compra",
    realityScanForensics: "REALITYSCAN FORENSICS",
    ready: "Listo",
    choosePaymentMethod: "Elige el método de pago",
    mpPaymentOptions: "PIX, Tarjeta, Boleto",
    paypalPaymentOptions: "Tarjeta, Saldo PayPal (USD)",
    encryptedTransactionMsg: "Tu transacción se procesa en un entorno cifrado. Aceptamos Mercado Pago (BRL) y PayPal (USD).",
    acceptCardsPixPaypal: "Aceptamos tarjetas, PIX y PayPal",
    dataSecurity: "Seguridad de datos",
    endToEndEncryption: "Cifrado de extremo a extremo",
    realVerdict: "Veredicto Real",
    authenticitySeal: "Sello de autenticidad RealityScan",
    serverOfflineTitle: "Servidor Local Desconectado",
    serverOfflineDesc: "Tu archivo server.js no está ejecutándose en este entorno de vista previa online. Para probar el flujo ahora, usa el modo de simulación a continuación:",
    simulateSuccessDemo: "Simular Éxito (Modo Demo)",
    loginToUpgrade: "Por favor, inicia sesión con tu cuenta Google para actualizar.",
    serverError: "Error al conectar con el servidor.",
    simulateSuccess: "Simular Éxito",
    payWithMp: "Pagar con Mercado Pago",
    subscriptionConfirmed: "Suscripción Confirmada",
    defenseInfra: "Infraestructura de Defensa Activa",
    planLabel: "Plan",
    protocol: "Protocolo",
    issued: "Emisión",
    backToDefense: "Volver a la Defensa",
    forensicCore: "REALITYSCAN FORENSIC CORE",
    startForensicScan: "envía archivos para análisis",
    forensicCamera: "CÁMARA FORENSE",
    forensicUpload: "UPLOAD FORENSE",
    businessMode: "MODO BUSINESS FORENSE",
    feedScam: "FeedScam",
    feedScamDesc: "Monitoreo de pantalla en tiempo real para redes sociales.",
    faceScam: "FaceScam",
    faceScamDesc: "Validación biométrica facial y búsqueda de duplicados digitales.",
    voiceScam: "VoiceScam",
    voiceScamDesc: "Detecte clones de voz neurales y manipulación de audio.",
    activateMonitor: "Activar Monitor",
    activateShort: "Activar",
    deactivateMonitor: "Desactivar Monitor",
    changeNetwork: "Cambiar red",
    networkOpenedHint: "Red abierta. Haz clic en Activar Monitor para compartir.",
    startRecon: "Iniciar Recon",
    uploadAudio: "Subir Audio",
    romanticDefense: "Defensa Emocional On",
    romanticScam: "Anti-estafa Romántica",
    howToUse: "Cómo usar",
    sentryInstructions: "Ve a la pestaña del feed, pausa en el vídeo o foto que quieras analizar y haz clic en Nueva análisis. Se emitirán alertas al detectar contenido con IA.",
    sentryActive: "SENTRY_ACTIVE",
    analyzing: "ANALIZANDO",
    analysisComplete: "ANÁLISIS_COMPLETADO",
    readyToAnalyze: "LISTO_PARA_ANALIZAR",
    processingCapture: "Procesando captura...",
    clickNewAnalysis: "Haz clic en Nueva análisis",
    aiDetected: "Contenido con IA detectado",
    integrityOk: "Integridad OK",
    analysesInSession: "análisis en esta sesión",
    alertAiContent: "Alerta: Contenido con IA detectado",
    standbyMode: "Modo_Espera",
    operational: "Operacional",
    analyzeAgain: "Analizar de nuevo",
    newAnalysisBtn: "Nueva análisis",
    sentryReport: "Informe Sentry - RealityScan",
    sentryNetworkPickerTitle: "Monitor de Feed",
    sentryNetworkPickerSub: "Elige la red social",
    sentryNetworkPickerHint: "La red se abrirá en nueva pestaña. Comparte esa pestaña para analizar.",
    sentryGuideTitle: "Cómo funciona",
    sentryStep1: "Elige la red arriba — se abrirá en nueva pestaña.",
    sentryStep2: "Cuando el navegador pida, selecciona la PESTAÑA de la red social en el diálogo.",
    sentryStep3: "Ve al feed, pausa en el vídeo/foto y haz clic en Nueva análisis en el miniHUD.",
    sentryStep2Confirm: "Vuelve a la app y haz clic en Confirmar y compartir. El Mini HUD se abrirá en ventana flotante y el navegador te pedirá elegir la pestaña de la red social.",
    sentryConfirmAndShare: "Confirmar y compartir",
    sentryBackToStep1: "Volver",
    indicatorsDetailTitle: "Indicadores forenses detallados",
    sentryNetworkInstagram: "Instagram",
    sentryNetworkFacebook: "Facebook",
    sentryNetworkTiktok: "TikTok",
    sentryNetworkTwitter: "X (Twitter)",
    sentryNetworkYoutube: "YouTube",
    generatedAt: "Generado en",
    totalAnalyses: "Total de análisis",
    risk: "Riesgo",
    paymentReceived: "¡Pago recibido! Inicia sesión para ver tu plan actualizado.",
    loginToSeePlan: "Inicia sesión para ver tu plan actualizado.",
    enter: "Entrar",
    planCommunity: "Gratuito",
    planAdvanced: "Advanced",
    planBusiness: "Business",
    planCurrent: "Plan Actual",
    subscribeAdvanced: "Suscribir Advanced",
    requestBusiness: "Solicitar Business",
    terminalBusiness: "TERMINAL BUSINESS",
    businessPanelSubtitle: "Panel de control avanzado para operaciones a gran escala y cumplimiento legal.",
    databaseTitle: "DATABASE",
    databaseSubtitle: "Repositorio de escaneos positivos para IA",
    backToTerminal: "Volver al Terminal",
    database: "Database",
    exportCsv: "Exportar CSV",
    totalProtocols: "Total de Protocolos",
    aiAlertsStored: "Alertas IA almacenados",
    aiDetectedCard: "IA Detectada",
    positiveScans: "Escaneos positivos",
    avgRisk: "Riesgo Medio",
    avgOfAlerts: "Promedio de alertas",
    searchPlaceholderDb: "Buscar por archivo, veredicto o fecha...",
    noAiAlerts: "Ninguna alerta IA almacenada",
    runAnalysisPrompt: "Ejecuta análisis y detecta contenido con IA para ver los registros aquí.",
    syncSecure: "Sincronizando con Servidor Seguro...",
    endBusinessSession: "Cerrar Sesión Business",
    pdfReportEnabled: "Informe PDF activado",
    runAnalysisForPdf: "Ejecuta un análisis para generar informes técnicos en PDF.",
    goToAnalysis: "Ir a análisis",
    activatePdfReport: "Activar informe PDF",
    pdfReportSub: "Exportación automatizada de informes técnicos escritos",
    requestJudicial: "Solicitar informes judiciales",
    judicialSub: "Documentación pericial para fines legales",
    blockchainAudit: "Auditoría blockchain",
    blockchainSub: "Registro inmutable en red descentralizada",
    statusEnabled: "// STATUS: ENABLED",
    statusStandby: "// STATUS: STANDBY",
    defenseDivision: "RealityScan Defense Division",
    sessionProtected: "Sesión protegida por cifrado asimétrico",
    painelBusiness: "Panel Business",
    painelAdmin: "Panel Admin",
    corpPortalTitle: "Elevare Tech AI",
    corpPortalSubtitle: "IA Corporativa · Automatización · Conocimiento",
    corpSwitchMode: "Cambiar a modo usuario",
    corpKnowledge: "Base de Conocimiento",
    corpKnowledgeDesc: "Documentos, manuales y datos que entrenan la IA de la empresa",
    corpChat: "Chat IA Interno",
    corpChatDesc: "IA entrenada para responder al equipo",
    corpAutomations: "Automatizaciones",
    corpAutomationsDesc: "Flujos e integraciones automatizadas",
    corpDataAnalysis: "Análisis de Datos",
    corpDataAnalysisDesc: "Dashboards e informes inteligentes",
    corpSupport: "Soporte IA",
    corpSupportDesc: "Atención técnica con IA",
    corpSystemRequests: "Pedidos de Sistema",
    corpSystemRequestsDesc: "Solicite automatizaciones y sistemas a medida",
    corpReports: "Informes",
    corpReportsDesc: "Informes automáticos y exportaciones",
    corpComingSoon: "Próximamente",
    cancelBtn: "Cancelar",
    enterTerminalBtnShort: "ENTRAR AL TERMINAL",
    registerAgentBtn: "REGISTRAR AGENTE",
    planDetailsDesc: "Los planes Advanced y Business ofrecen recursos extendidos y mayor prioridad de procesamiento.",
    returnToDefense: "Volver al Terminal de Defensa",
    dateTime: "Fecha / Hora",
    file: "Archivo",
    type: "Tipo",
    source: "Fuente",
    details: "Detalles",
    noName: "Sin Nombre",
    forensicRecord: "Registro Forense",
    riskLevel: "Nivel de Riesgo",
    technicalAnalysis: "Análisis Técnico",
    evidenceLabel: "Evidencias",
    videoLinkLabel: "Enlace del vídeo",
    noDetailedDesc: "No hay descripción detallada disponible.",
    exportTxt: "Exportar TXT",
    closeBtn: "Cerrar",
    atTime: "a las",
    chatOnline: "IA NGT en línea. Envía texto, capturas o vídeos.",
    chatPlaceholder: "Describe tu duda o pide una opinión...",
    chatAttach: "Adjuntar archivo",
    chatVoiceStart: "Hablar",
    chatVoiceStop: "Parar",
    chatVoicePlay: "Escuchar respuesta",
    chatAnalyzing: "Analizando",
    chatTyping: "Escribiendo...",
    chatDownloadPdf: "Descargar Informe PDF",
    chatAgentAdvanced: "Advanced",
    chatAgentBusiness: "Business",
    chatLangLabel: "Idioma",
    reasoningAgentWelcome: "Agente de Raciocínio NGT. Conversa, debate y pide opiniones. Solo texto.",
    reasoningAgentModalTitle: "Agente de Raciocínio NGT",
    reasoningAgentModalDesc: "Conversa con un experto en estafas y fraudes digitales. Debate ideas, pide opiniones y valida sospechas en tiempo real. Suscríbete para acceso ilimitado — desde 4,99 USD/mes.",
    reasoningAgentModalBenefits: "✓ Conversaciones ilimitadas con IA especializada\n✓ Debates y pareceres en tiempo real\n✓ Modos Advanced y Business\n✓ Protección completa contra estafas",
    chatMenuTitle: "Elige el modo",
    chatMenuReasoning: "Agente de Raciocínio",
    chatMenuReasoningDesc: "Conversaciones, debates y opiniones. Solo texto y audio.",
    chatMenuReasoningLimit: "1 sesión gratis/día. Suscríbete para más.",
    chatMenuMedia: "Análisis de Medios",
    chatMenuMediaDesc: "Vídeos, audio y archivos. Consume créditos.",
    chatMenuMediaLimit: "1 sesión gratis/día. Suscríbete para más.",
    chatMenuCorporate: "Agente Corporativo",
    chatMenuCorporateDesc: "IA entrenada con la base de conocimiento de tu empresa. Plan Business.",
    chatMenuCorporateLimit: "Exclusivo plan Business.",
    corporateAgentWelcome: "Agente Corporativo NGT. Conversa con la IA que conoce tu empresa. Usa la base de conocimiento en Perfil > Base Corporativa.",
    corporateKnowledgeTitle: "Base de Conocimiento Corporativo",
    corporateKnowledgeSubtitle: "Texto, procesos y datos que la IA usará para responder. Exclusivo Business.",
    corporateKnowledgePlaceholder: "Pega aquí documentos, políticas, procesos, FAQ o cualquier texto que la IA debe usar para responder...",
    corporateKnowledgeSave: "Guardar",
    corporateKnowledgeError: "Error al cargar o guardar.",
    chatMediaWelcome: "Análisis de Medios NGT. Envía vídeos, audio o archivos para análisis forense. Cada análisis consume créditos.",
    chatMediaWelcomeFree: "Tienes 1 análisis gratis en esta sesión. Envía un archivo o texto para probar el análisis forense NGT.",
    chatMediaPlaceholder: "Describe la sospecha o adjunta archivo...",
    corporateKnowledgeDesc: "IA privada de la empresa — datos, procesos, políticas.",
    corporateAgentMenu: "Agente Corporativo",
    corporateAgentMenuDesc: "IA entrenada en la base de conocimiento de tu empresa. Business.",
    save: "Guardar",
    apiForDevelopers: "API para Desarrolladores",
    apiForDevelopersDesc: "Integre detección de IA, análisis forense y generación de texto en su app. Endpoints REST con autenticación por API Key.",
    apiPlansInfo: "Planes Free (50 req/día), Basic, Pro y Enterprise.",
    apiKeySecure: "API Key segura (sk_live_...)",
    apiConsumptionLogs: "Control de consumo y logs",
    devPanel: "Panel Dev",
    viewApiPlans: "Ver planes API",
    newBadge: "NUEVO",
    apiPlansTitle: "Planes API para Desarrolladores",
    apiPlansSubtitle: "Escala tu integración con RealityScan. Endpoints REST para detección de IA, análisis forense y generación de texto.",
    apiBasic: "Basic",
    apiPro: "Pro",
    apiEnterprise: "Enterprise",
    apiCreateKey: "Crear API Key",
    apiCopy: "Copiar",
    apiRegenerate: "Regenerar",
    apiCurrentPlan: "Plan actual",
    apiUpgrade: "Actualizar",
    apiDashboard: "Dashboard",
    apiKeys: "API Keys",
    apiUsage: "Uso",
    apiBilling: "Plan y Facturación",
    apiDocs: "Documentación",
    apiTester: "Probador",
    apiLogs: "Logs",
    apiSettings: "Configuración",
    apiTestApi: "Probar API",
    apiRequestsMonth: "Solicitudes del mes",
    apiLimitToday: "Consumo hoy",
    apiPlanLimit: "Límite del plan",
    apiSecurity: "Seguridad",
    apiDevPanelTitle: "Panel Dev API",
    apiLoginToManage: "Inicie sesión para crear y gestionar su API Key.",
    apiRequestsMonthShort: "Solicitudes/mes",
    apiCostEst: "Costo est.",
    apiAccountStatus: "Estado de cuenta",
    apiActive: "Activa",
    apiBlocked: "Bloqueada",
    apiUsageLast7: "Uso últimos 7 días",
    apiCopyNow: "Copie ahora — la clave completa no se mostrará de nuevo.",
    apiCopied: "¡Copiado!",
    apiInactive: "Inactiva",
    apiNoKeyYet: "Aún no tiene una API key.",
    apiMostPopular: "Más popular",
    apiSubscribeMp: "Suscribir con Mercado Pago",
    apiSubscribePayPal: "Suscribir con PayPal",
    apiCheckout: "Ir al Checkout",
    apiPaymentInfo: "Pago seguro vía Mercado Pago o PayPal. Plan activado en hasta 1 minuto tras aprobación.",
    apiCreateKeyHint: "Cree su API Key en el Panel Dev antes de suscribirse — la actualización se aplicará a su clave existente.",
    apiRequestsUnit: "solicitudes",
    apiPerMonth: "/mes",
    apiUnlimited: "Ilimitado",
    apiModelMostUsed: "Modelo más usado",
    apiLoginToSubscribe: "Inicia sesión para suscribirte a un plan de API.",
    apiErrorPayPal: "Error al crear pago PayPal",
    apiErrorPaymentLink: "Enlace de checkout PayPal no recibido.",
    apiErrorPayment: "Error al generar enlace de pago.",
    apiErrorCheckout: "Error al iniciar checkout.",
    apiBasicF1: "5.000 solicitudes/mes",
    apiBasicF2: "API Key dedicada",
    apiBasicF3: "Registros de uso",
    apiBasicF4: "Soporte por correo",
    apiProF1: "20.000 solicitudes/mes",
    apiProF2: "Prioridad en la fila",
    apiProF3: "Todos los endpoints",
    apiProF4: "Soporte prioritario",
    apiEntF1: "Solicitudes ilimitadas",
    apiEntF2: "SLA garantizado",
    apiEntF3: "Soporte dedicado",
    apiEntF4: "Integración personalizada",
    apiSignIn: "Entrar",
    apiLoadFail: "Error al cargar datos.",
    apiRegenerateConfirm: "Regenerar invalidará la clave actual. ¿Continuar?",
    apiCreateKeyError: "Error al crear clave.",
    apiRegenerateError: "Error al regenerar.",
    apiTestError: "Error al probar.",
    apiUsageConsumption: "Uso y consumo",
    apiRequestsPerDay: "Solicitudes por día",
    apiToday: "hoy",
    apiTotalPeriod: "Total del período",
    apiEndpointMostUsed: "Endpoint más usado",
    apiUsageChart: "Gráfico de uso",
    apiDays7: "7 días",
    apiDays30: "30 días",
    apiMonthlyLimit: "Límite mensual",
    apiRenewal: "Renovación",
    apiValue: "Valor",
    apiUpgradePlan: "Actualizar plan",
    apiBaseUrl: "URL base",
    apiEndpoints: "Endpoints",
    apiExampleFetch: "Ejemplo (fetch)",
    apiEnterPrompt: "Escribe un prompt",
    apiTestApiPlaceholder: "Ej: Genera un resumen sobre inteligencia artificial",
    apiResponse: "Respuesta",
    apiLogsTitle: "Logs de solicitudes",
    apiNoRequestsYet: "Aún no hay solicitudes.",
    apiDate: "Fecha",
    apiEndpoint: "Endpoint",
    apiModel: "Modelo",
    apiStatus: "Estado",
    apiLimitPerMin: "Límite por minuto",
    apiRegenerateHint: "Para regenerar tu clave (invalida la actual), ve a API Keys.",
    apiGoToKeys: "Ir a API Keys",
    apiEmail: "Correo",
    apiAccountHint: "Para eliminar cuenta o cambiar correo, usa el Panel de usuario (Perfil).",
    apiPlanFree: "Gratis",
    apiPlanBasicPrice: "R$ 49,90/mes",
    apiPlanProPrice: "R$ 149,90/mes",
    apiPlanEnterprisePrice: "R$ 499,90/mes",
  },
};

export const getI18n = (lang: string): I18nKeys => {
  return translations[lang as Language] || translations.PT;
};

// Contexto para i18n com persistência Firebase
interface I18nContextValue {
  lang: Language;
  setLang: (lang: Language, options?: { persist?: boolean }) => Promise<void>;
  t: I18nKeys;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const LANG_STORAGE_KEY = 'rs_preferred_lang';
const LANG_MAP: Record<Language, string> = { PT: 'pt-BR', EN: 'en', ES: 'es' };

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(LANG_STORAGE_KEY) as Language | null;
      return (stored && ['PT', 'EN', 'ES'].includes(stored)) ? stored : 'PT';
    }
    return 'PT';
  });

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = LANG_MAP[lang];
    }
  }, [lang]);

  const setLang = useCallback(async (newLang: Language, options?: { persist?: boolean }) => {
    const shouldPersist = options?.persist !== false;
    setLangState(newLang);
    if (shouldPersist && typeof window !== 'undefined') {
      localStorage.setItem(LANG_STORAGE_KEY, newLang);
      const user = auth.currentUser;
      if (user?.uid) {
        try {
          await updateUserLanguage(user.uid, newLang);
        } catch (err) {
          console.error('Falha ao persistir idioma no Firebase:', err);
        }
      }
    }
  }, []);

  const t = getI18n(lang);

  return React.createElement(I18nContext.Provider, { value: { lang, setLang, t } }, children);
};

export const useI18n = (): I18nContextValue => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
};

export const useI18nOptional = (): I18nContextValue | null => useContext(I18nContext);
