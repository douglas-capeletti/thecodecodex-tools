export const REF_SECTIONS = ["all", "http", "ports", "mime", "ascii"] as const
export type RefSection = (typeof REF_SECTIONS)[number]

export const HTTP_CLASSES = ["all", "1xx", "2xx", "3xx", "4xx", "5xx"] as const
export type HttpClass = (typeof HTTP_CLASSES)[number]

export interface HttpStatusEntry {
  code: number
  phrase: string
  category: Exclude<HttpClass, "all">
  rfc: string
  cacheable: boolean
  pt: string
  en: string
}

export interface NetworkPortEntry {
  port: number
  protocol: "TCP" | "UDP" | "TCP/UDP"
  service: string
  category: "web" | "database" | "messaging" | "infra" | "mail"
  pt: string
  en: string
}

export interface MimeTypeEntry {
  essence: string
  extensions: string[]
  category: "api" | "web" | "image" | "media" | "document"
  pt: string
  en: string
}

export interface AsciiEntry {
  dec: number
  hex: string
  oct: string
  bin: string
  symbol: string
  escape?: string
  category: "control" | "whitespace" | "digit" | "upper" | "lower" | "punctuation"
  pt: string
  en: string
}

export const HTTP_CODES: HttpStatusEntry[] = [
  { code: 100, phrase: "Continue", category: "1xx", rfc: "RFC 9110", cacheable: false, pt: "Cabeçalhos recebidos; o cliente pode enviar o corpo da requisição.", en: "Request headers received; client should proceed to send the body." },
  { code: 101, phrase: "Switching Protocols", category: "1xx", rfc: "RFC 9110", cacheable: false, pt: "Servidor aceitou trocar o protocolo (ex.: upgrade para WebSocket).", en: "Server is switching protocols as requested (e.g., WebSocket upgrade)." },
  { code: 103, phrase: "Early Hints", category: "1xx", rfc: "RFC 8297", cacheable: false, pt: "Antecipa cabeçalhos Link para pré-carregar recursos antes da resposta final.", en: "Sends preliminary Link headers so the browser can preload assets early." },
  { code: 200, phrase: "OK", category: "2xx", rfc: "RFC 9110", cacheable: true, pt: "Requisição bem-sucedida com conteúdo no corpo da resposta.", en: "Standard response for successful HTTP requests." },
  { code: 201, phrase: "Created", category: "2xx", rfc: "RFC 9110", cacheable: false, pt: "Novo recurso criado com sucesso (geralmente inclui cabeçalho Location).", en: "Request succeeded and a new resource was created (often with Location header)." },
  { code: 202, phrase: "Accepted", category: "2xx", rfc: "RFC 9110", cacheable: false, pt: "Recebido para processamento assíncrono em fila/background.", en: "Accepted for asynchronous processing, but not yet completed." },
  { code: 204, phrase: "No Content", category: "2xx", rfc: "RFC 9110", cacheable: true, pt: "Sucesso sem corpo de resposta (comum em DELETE ou PUT/PATCH).", en: "Succeeded with no response payload body (common for DELETE or PUT)." },
  { code: 206, phrase: "Partial Content", category: "2xx", rfc: "RFC 9110", cacheable: true, pt: "Entrega parcial de bytes solicitada via cabeçalho Range (streaming/download).", en: "Partial byte range delivered in response to a Range header." },
  { code: 207, phrase: "Multi-Status", category: "2xx", rfc: "RFC 4918", cacheable: false, pt: "Resposta lote/batch contendo múltiplos códigos de status independentes.", en: "Batch response conveying status for multiple independent operations." },
  { code: 301, phrase: "Moved Permanently", category: "3xx", rfc: "RFC 9110", cacheable: true, pt: "Redirecionamento definitivo; clientes podem converter POST em GET.", en: "Permanent redirect; user agents may change POST to GET." },
  { code: 302, phrase: "Found", category: "3xx", rfc: "RFC 9110", cacheable: false, pt: "Redirecionamento temporário para outra URI (Location).", en: "Temporary redirect to another URI specified in Location." },
  { code: 303, phrase: "See Other", category: "3xx", rfc: "RFC 9110", cacheable: false, pt: "Redireciona para um GET em outra URI após processar um POST (padrão PRG).", en: "Redirects to another URI using GET after a POST (Post/Redirect/Get)." },
  { code: 304, phrase: "Not Modified", category: "3xx", rfc: "RFC 9110", cacheable: true, pt: "Recurso não mudou desde ETag / If-Modified-Since; use o cache local.", en: "Resource has not changed since ETag / If-Modified-Since; use cached copy." },
  { code: 307, phrase: "Temporary Redirect", category: "3xx", rfc: "RFC 9110", cacheable: false, pt: "Redirecionamento temporário preservando o método HTTP (POST continua POST).", en: "Temporary redirect that strictly preserves the HTTP method and body." },
  { code: 308, phrase: "Permanent Redirect", category: "3xx", rfc: "RFC 9110", cacheable: true, pt: "Redirecionamento permanente preservando o método HTTP e o corpo.", en: "Permanent redirect that strictly preserves the HTTP method and body." },
  { code: 400, phrase: "Bad Request", category: "4xx", rfc: "RFC 9110", cacheable: false, pt: "Sintaxe inválida, JSON malformado ou parâmetros obrigatórios ausentes.", en: "Malformed syntax, invalid JSON, or missing required parameters." },
  { code: 401, phrase: "Unauthorized", category: "4xx", rfc: "RFC 9110", cacheable: false, pt: "Não autenticado: falta credencial/token válido (WWW-Authenticate).", en: "Unauthenticated: valid credentials or token required." },
  { code: 403, phrase: "Forbidden", category: "4xx", rfc: "RFC 9110", cacheable: false, pt: "Autenticado, porém sem permissão de acesso ao recurso.", en: "Authenticated, but lacks permission to access the target resource." },
  { code: 404, phrase: "Not Found", category: "4xx", rfc: "RFC 9110", cacheable: true, pt: "Recurso não encontrado na URI solicitada (ou ocultado por segurança).", en: "Resource not found at the requested URI." },
  { code: 405, phrase: "Method Not Allowed", category: "4xx", rfc: "RFC 9110", cacheable: true, pt: "A rota existe, mas não aceita este verbo HTTP (ex.: POST em rota somente GET).", en: "Target resource does not support this HTTP method (see Allow header)." },
  { code: 408, phrase: "Request Timeout", category: "4xx", rfc: "RFC 9110", cacheable: false, pt: "Cliente demorou demais para enviar a requisição completa.", en: "Server timed out waiting for the client to finish sending the request." },
  { code: 409, phrase: "Conflict", category: "4xx", rfc: "RFC 9110", cacheable: false, pt: "Conflito com o estado atual (ex.: chave única duplicada ou versão otimista defasada).", en: "Conflict with current resource state (e.g., duplicate key or version mismatch)." },
  { code: 410, phrase: "Gone", category: "4xx", rfc: "RFC 9110", cacheable: true, pt: "Recurso foi removido permanentemente e não voltará a existir.", en: "Resource was permanently removed and is no longer available." },
  { code: 412, phrase: "Precondition Failed", category: "4xx", rfc: "RFC 9110", cacheable: false, pt: "Condição If-Match / If-Unmodified-Since falhou (controle de concorrência).", en: "Precondition in If-Match / If-Unmodified-Since evaluated to false." },
  { code: 413, phrase: "Content Too Large", category: "4xx", rfc: "RFC 9110", cacheable: false, pt: "Payload da requisição excede o limite aceito pelo servidor.", en: "Request payload is larger than the server is willing or able to process." },
  { code: 415, phrase: "Unsupported Media Type", category: "4xx", rfc: "RFC 9110", cacheable: false, pt: "Content-Type enviado não é suportado pelo endpoint.", en: "Payload format (Content-Type) is not supported by the target resource." },
  { code: 418, phrase: "I'm a teapot", category: "4xx", rfc: "RFC 2324", cacheable: false, pt: "Easter egg HTCPCP: o bule de chá recusa-se a passar café.", en: "HTCPCP easter egg: the server refuses to brew coffee because it is a teapot." },
  { code: 422, phrase: "Unprocessable Content", category: "4xx", rfc: "RFC 9110", cacheable: false, pt: "Sintaxe JSON válida, mas falhou nas regras de validação semântica/negócio.", en: "Well-formed syntax, but failed semantic or domain validation rules." },
  { code: 429, phrase: "Too Many Requests", category: "4xx", rfc: "RFC 6585", cacheable: false, pt: "Rate limit atingido; consulte o cabeçalho Retry-After.", en: "Rate limit exceeded; check the Retry-After header before retrying." },
  { code: 451, phrase: "Unavailable For Legal Reasons", category: "4xx", rfc: "RFC 7725", cacheable: true, pt: "Acesso bloqueado por exigência legal, ordem judicial ou restrição geográfica.", en: "Access denied due to legal demand, censorship, or regional compliance." },
  { code: 500, phrase: "Internal Server Error", category: "5xx", rfc: "RFC 9110", cacheable: false, pt: "Erro inesperado não tratado na aplicação servidora.", en: "Unhandled exception or unexpected condition on the server." },
  { code: 501, phrase: "Not Implemented", category: "5xx", rfc: "RFC 9110", cacheable: true, pt: "Funcionalidade ou método não implementado pelo servidor.", en: "Server does not support the functionality required to fulfill the request." },
  { code: 502, phrase: "Bad Gateway", category: "5xx", rfc: "RFC 9110", cacheable: false, pt: "Proxy/gateway recebeu resposta inválida do servidor upstream.", en: "Gateway or reverse proxy received an invalid response from upstream." },
  { code: 503, phrase: "Service Unavailable", category: "5xx", rfc: "RFC 9110", cacheable: false, pt: "Servidor temporariamente sobrecarregado ou em manutenção (veja Retry-After).", en: "Server is temporarily overloaded or down for maintenance." },
  { code: 504, phrase: "Gateway Timeout", category: "5xx", rfc: "RFC 9110", cacheable: false, pt: "Proxy/gateway não recebeu resposta do servidor upstream dentro do prazo.", en: "Gateway or reverse proxy timed out waiting for the upstream server." },
]

export const NETWORK_PORTS: NetworkPortEntry[] = [
  { port: 20, protocol: "TCP", service: "FTP Data", category: "infra", pt: "Transferência ativa de dados FTP.", en: "FTP active data transfer channel." },
  { port: 21, protocol: "TCP", service: "FTP Control", category: "infra", pt: "Controle de comandos FTP.", en: "FTP command and control channel." },
  { port: 22, protocol: "TCP", service: "SSH / SFTP / SCP", category: "infra", pt: "Acesso remoto seguro, túneis e transferência de arquivos via SSH.", en: "Secure Shell remote login, port forwarding, and SFTP/SCP." },
  { port: 25, protocol: "TCP", service: "SMTP", category: "mail", pt: "Roteamento de e-mail entre servidores (MTA).", en: "Simple Mail Transfer Protocol for server-to-server relay." },
  { port: 53, protocol: "TCP/UDP", service: "DNS", category: "infra", pt: "Resolução de nomes de domínio (UDP para consultas, TCP para zonas/respostas grandes).", en: "Domain Name System resolver and zone transfers." },
  { port: 67, protocol: "UDP", service: "DHCP Server", category: "infra", pt: "Servidor de configuração dinâmica de IP na rede local.", en: "Dynamic Host Configuration Protocol server." },
  { port: 80, protocol: "TCP", service: "HTTP", category: "web", pt: "Tráfego web HTTP em texto claro (sem TLS).", en: "Unencrypted Hypertext Transfer Protocol." },
  { port: 123, protocol: "UDP", service: "NTP", category: "infra", pt: "Sincronização de relógio de rede (Network Time Protocol).", en: "Network Time Protocol clock synchronization." },
  { port: 143, protocol: "TCP", service: "IMAP", category: "mail", pt: "Leitura de caixas de e-mail sem TLS.", en: "Internet Message Access Protocol (unencrypted)." },
  { port: 389, protocol: "TCP/UDP", service: "LDAP", category: "infra", pt: "Diretório de usuários e autenticação (Active Directory / OpenLDAP).", en: "Lightweight Directory Access Protocol." },
  { port: 443, protocol: "TCP/UDP", service: "HTTPS / HTTP/3 (QUIC)", category: "web", pt: "Tráfego web criptografado com TLS (TCP) ou QUIC (UDP).", en: "Encrypted HTTP over TLS (TCP) or QUIC/HTTP/3 (UDP)." },
  { port: 445, protocol: "TCP", service: "SMB", category: "infra", pt: "Compartilhamento de arquivos e impressoras em rede Windows/Samba.", en: "Server Message Block file sharing." },
  { port: 465, protocol: "TCP", service: "SMTPS", category: "mail", pt: "Submissão de e-mail SMTP com TLS implícito.", en: "SMTP over implicit TLS for email submission." },
  { port: 587, protocol: "TCP", service: "SMTP Submission", category: "mail", pt: "Submissão de e-mail por clientes autenticados (STARTTLS).", en: "Authenticated email message submission (STARTTLS)." },
  { port: 636, protocol: "TCP", service: "LDAPS", category: "infra", pt: "Diretório LDAP criptografado sobre TLS.", en: "LDAP over TLS." },
  { port: 993, protocol: "TCP", service: "IMAPS", category: "mail", pt: "Acesso IMAP criptografado sobre TLS.", en: "IMAP over TLS." },
  { port: 1433, protocol: "TCP", service: "SQL Server", category: "database", pt: "Porta padrão do Microsoft SQL Server.", en: "Microsoft SQL Server default listener." },
  { port: 1883, protocol: "TCP", service: "MQTT", category: "messaging", pt: "Mensageria leve para IoT e telemetria.", en: "Message Queuing Telemetry Transport (IoT)." },
  { port: 2049, protocol: "TCP/UDP", service: "NFS", category: "infra", pt: "Sistema de arquivos em rede (Network File System).", en: "Network File System shared mounts." },
  { port: 2181, protocol: "TCP", service: "ZooKeeper", category: "messaging", pt: "Coordenação distribuída para clientes Apache ZooKeeper.", en: "Apache ZooKeeper client coordination port." },
  { port: 2379, protocol: "TCP", service: "etcd", category: "database", pt: "API de clientes do banco chave-valor distribuído etcd (Kubernetes).", en: "etcd key-value store client API." },
  { port: 3000, protocol: "TCP", service: "Dev Server / Grafana", category: "web", pt: "Porta comum para servidores Node/React/Astro de desenvolvimento e Grafana.", en: "Common local web dev server and Grafana dashboard port." },
  { port: 3306, protocol: "TCP", service: "MySQL / MariaDB", category: "database", pt: "Porta padrão dos bancos relacionais MySQL e MariaDB.", en: "MySQL and MariaDB relational database default port." },
  { port: 3389, protocol: "TCP/UDP", service: "RDP", category: "infra", pt: "Área de trabalho remota do Windows (Remote Desktop Protocol).", en: "Windows Remote Desktop Protocol." },
  { port: 4222, protocol: "TCP", service: "NATS", category: "messaging", pt: "Conexão de clientes ao broker de mensageria NATS.", en: "NATS messaging system client port." },
  { port: 4317, protocol: "TCP", service: "OTLP / gRPC", category: "infra", pt: "Coletor OpenTelemetry via protocolo gRPC (traces, métricas e logs).", en: "OpenTelemetry Collector receiver over gRPC." },
  { port: 4318, protocol: "TCP", service: "OTLP / HTTP", category: "infra", pt: "Coletor OpenTelemetry via HTTP/protobuf ou JSON.", en: "OpenTelemetry Collector receiver over HTTP." },
  { port: 5432, protocol: "TCP", service: "PostgreSQL", category: "database", pt: "Porta padrão do banco de dados PostgreSQL.", en: "PostgreSQL database default port." },
  { port: 5672, protocol: "TCP", service: "AMQP / RabbitMQ", category: "messaging", pt: "Conexão de produtores e consumidores AMQP 0-9-1 (RabbitMQ).", en: "AMQP 0-9-1 messaging broker (RabbitMQ)." },
  { port: 6379, protocol: "TCP", service: "Redis / Valkey", category: "database", pt: "Banco em memória, cache e pub/sub Redis/Valkey.", en: "Redis and Valkey in-memory data store." },
  { port: 6443, protocol: "TCP", service: "Kubernetes API", category: "infra", pt: "Control plane HTTPS API Server do Kubernetes.", en: "Kubernetes API server HTTPS endpoint." },
  { port: 8080, protocol: "TCP", service: "HTTP Alternate", category: "web", pt: "Porta HTTP alternativa comum para APIs backend, proxies e containers.", en: "Standard alternative HTTP port for backends, proxies, and containers." },
  { port: 9090, protocol: "TCP", service: "Prometheus", category: "infra", pt: "Interface web e API HTTP de métricas do Prometheus.", en: "Prometheus monitoring web UI and HTTP API." },
  { port: 9092, protocol: "TCP", service: "Apache Kafka", category: "messaging", pt: "Broker de eventos e streaming Apache Kafka (plaintext/SASL).", en: "Apache Kafka event streaming broker." },
  { port: 9200, protocol: "TCP", service: "Elasticsearch / OpenSearch", category: "database", pt: "API REST HTTP de busca e indexação do Elasticsearch/OpenSearch.", en: "Elasticsearch and OpenSearch REST HTTP API." },
  { port: 11211, protocol: "TCP/UDP", service: "Memcached", category: "database", pt: "Sistema distribuído de cache em memória Memcached.", en: "Memcached in-memory caching system." },
  { port: 15672, protocol: "TCP", service: "RabbitMQ UI", category: "messaging", pt: "Painel web de administração e API HTTP do RabbitMQ.", en: "RabbitMQ management web UI and HTTP API." },
  { port: 27017, protocol: "TCP", service: "MongoDB", category: "database", pt: "Porta padrão do banco de documentos MongoDB (mongod/mongos).", en: "MongoDB document database default port." },
  { port: 51820, protocol: "UDP", service: "WireGuard", category: "infra", pt: "Túnel VPN criptografado de alta performance WireGuard.", en: "WireGuard encrypted VPN tunnel." },
]

export const MIME_TYPES: MimeTypeEntry[] = [
  { essence: "application/json", extensions: [".json", ".map"], category: "api", pt: "Formato padrão de objetos e arrays JSON em APIs REST (UTF-8).", en: "Standard JSON payload format for REST APIs (UTF-8)." },
  { essence: "application/problem+json", extensions: [".json"], category: "api", pt: "Formato padronizado de detalhes de erro em APIs HTTP (RFC 9457 / RFC 7807).", en: "Standard Problem Details error payload for HTTP APIs (RFC 9457)." },
  { essence: "application/x-ndjson", extensions: [".ndjson", ".jsonl"], category: "api", pt: "JSON delimitado por quebra de linha (streaming e logs estruturados).", en: "Newline-delimited JSON for streaming and structured logs." },
  { essence: "text/event-stream", extensions: [".sse"], category: "api", pt: "Server-Sent Events (SSE) para streaming unidirecional em tempo real.", en: "Server-Sent Events (SSE) real-time push stream." },
  { essence: "application/x-www-form-urlencoded", extensions: [], category: "api", pt: "Parâmetros chave=valor codificados como query string no corpo do POST.", en: "Key-value pairs encoded like a URL query string in the request body." },
  { essence: "multipart/form-data", extensions: [], category: "api", pt: "Envio de formulários com upload de arquivos binários separados por boundary.", en: "Form submission containing binary file uploads separated by a boundary." },
  { essence: "application/graphql", extensions: [".graphql", ".gql"], category: "api", pt: "Consulta GraphQL enviada diretamente no corpo da requisição.", en: "GraphQL query string sent directly in the request body." },
  { essence: "application/wasm", extensions: [".wasm"], category: "web", pt: "Módulo binário WebAssembly (necessário para WebAssembly.instantiateStreaming).", en: "WebAssembly binary module (required for instantiateStreaming)." },
  { essence: "text/html", extensions: [".html", ".htm"], category: "web", pt: "Documento HTML renderizado pelo navegador.", en: "HTML document rendered by the browser." },
  { essence: "text/css", extensions: [".css"], category: "web", pt: "Folha de estilos CSS (navegadores rejeitam CSS com MIME incorreto em modo estrito).", en: "Cascading Style Sheets (strict mode requires this exact MIME type)." },
  { essence: "text/javascript", extensions: [".js", ".mjs"], category: "web", pt: "Código-fonte JavaScript / ES Modules (padrão oficial RFC 9239).", en: "JavaScript / ES Module source code (official standard per RFC 9239)." },
  { essence: "text/plain", extensions: [".txt", ".log", ".conf"], category: "web", pt: "Texto puro sem marcação.", en: "Unformatted plain text." },
  { essence: "text/markdown", extensions: [".md", ".markdown"], category: "document", pt: "Documento em sintaxe Markdown (RFC 7763).", en: "Markdown text document (RFC 7763)." },
  { essence: "text/csv", extensions: [".csv"], category: "document", pt: "Valores separados por vírgula para planilhas e importação de dados.", en: "Comma-separated values for spreadsheets and data exchange." },
  { essence: "application/pdf", extensions: [".pdf"], category: "document", pt: "Documento portátil Adobe/ISO PDF.", en: "Portable Document Format (PDF)." },
  { essence: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", extensions: [".xlsx"], category: "document", pt: "Planilha Microsoft Excel OpenXML (.xlsx).", en: "Microsoft Excel OpenXML workbook (.xlsx)." },
  { essence: "image/png", extensions: [".png"], category: "image", pt: "Imagem raster sem perdas com suporte a transparência alfa.", en: "Lossless raster image supporting alpha transparency." },
  { essence: "image/jpeg", extensions: [".jpg", ".jpeg"], category: "image", pt: "Imagem fotográfica com compressão com perdas JPEG.", en: "Photographic image with lossy JPEG compression." },
  { essence: "image/webp", extensions: [".webp"], category: "image", pt: "Formato moderno de imagem para web (com ou sem perdas, alfa e animação).", en: "Modern web image format supporting lossy/lossless, alpha, and animation." },
  { essence: "image/avif", extensions: [".avif"], category: "image", pt: "Imagem de alta eficiência baseada no codec AV1 (suporte a HDR).", en: "High-efficiency image format based on AV1 video codec." },
  { essence: "image/svg+xml", extensions: [".svg"], category: "image", pt: "Gráfico vetorial escalável baseado em XML.", en: "XML-based Scalable Vector Graphics." },
  { essence: "font/woff2", extensions: [".woff2"], category: "web", pt: "Fonte web comprimida com Brotli (Web Open Font Format 2).", en: "Brotli-compressed Web Open Font Format 2." },
  { essence: "audio/mpeg", extensions: [".mp3"], category: "media", pt: "Áudio comprimido MP3 (MPEG-1/2 Audio Layer III).", en: "MP3 audio stream (MPEG-1/2 Audio Layer III)." },
  { essence: "video/mp4", extensions: [".mp4", ".m4v"], category: "media", pt: "Contêiner de vídeo e áudio MP4 (H.264, HEVC, AV1).", en: "MP4 video and audio container." },
  { essence: "application/zip", extensions: [".zip"], category: "document", pt: "Arquivo compactado ZIP.", en: "ZIP compressed archive." },
  { essence: "application/gzip", extensions: [".gz", ".tgz"], category: "document", pt: "Arquivo ou stream compactado com gzip (RFC 1952).", en: "Gzip compressed archive or stream." },
  { essence: "application/octet-stream", extensions: [".bin", ".exe", ".iso"], category: "api", pt: "Fluxo binário genérico (força download quando associado a Content-Disposition).", en: "Arbitrary binary data stream." },
]

const CONTROL_CHARS: Record<number, { symbol: string, escape?: string, pt: string, en: string }> = {
  0: { symbol: "NUL", escape: "\\0", pt: "Caractere nulo (terminador de string em C)", en: "Null character (C string terminator)" },
  1: { symbol: "SOH", pt: "Início de cabeçalho (Start of Heading)", en: "Start of Heading" },
  2: { symbol: "STX", pt: "Início de texto (Start of Text)", en: "Start of Text" },
  3: { symbol: "ETX", pt: "Fim de texto (Ctrl+C / SIGINT no terminal)", en: "End of Text (Ctrl+C interrupt)" },
  4: { symbol: "EOT", pt: "Fim de transmissão (Ctrl+D / EOF no terminal)", en: "End of Transmission (Ctrl+D / EOF)" },
  5: { symbol: "ENQ", pt: "Consulta (Enquiry)", en: "Enquiry" },
  6: { symbol: "ACK", pt: "Confirmação (Acknowledge)", en: "Acknowledge" },
  7: { symbol: "BEL", escape: "\\a", pt: "Alerta sonoro do terminal (Bell)", en: "Terminal Bell alert" },
  8: { symbol: "BS", escape: "\\b", pt: "Retrocesso (Backspace)", en: "Backspace" },
  9: { symbol: "TAB", escape: "\\t", pt: "Tabulação horizontal (Horizontal Tab)", en: "Horizontal Tab" },
  10: { symbol: "LF", escape: "\\n", pt: "Quebra de linha Unix/Linux/macOS (Line Feed)", en: "Line Feed (Unix/Linux/macOS newline)" },
  11: { symbol: "VT", escape: "\\v", pt: "Tabulação vertical", en: "Vertical Tab" },
  12: { symbol: "FF", escape: "\\f", pt: "Avanço de página (Form Feed / Ctrl+L limpa terminal)", en: "Form Feed (Ctrl+L clears terminal)" },
  13: { symbol: "CR", escape: "\\r", pt: "Retorno de carro (usado em CRLF \\r\\n no Windows e HTTP)", en: "Carriage Return (used in Windows/HTTP CRLF \\r\\n)" },
  14: { symbol: "SO", pt: "Shift Out", en: "Shift Out" },
  15: { symbol: "SI", pt: "Shift In", en: "Shift In" },
  16: { symbol: "DLE", pt: "Data Link Escape", en: "Data Link Escape" },
  17: { symbol: "DC1", pt: "Device Control 1 (XON)", en: "Device Control 1 (XON)" },
  18: { symbol: "DC2", pt: "Device Control 2", en: "Device Control 2" },
  19: { symbol: "DC3", pt: "Device Control 3 (XOFF)", en: "Device Control 3 (XOFF)" },
  20: { symbol: "DC4", pt: "Device Control 4", en: "Device Control 4" },
  21: { symbol: "NAK", pt: "Confirmação negativa (Negative Acknowledge)", en: "Negative Acknowledge" },
  22: { symbol: "SYN", pt: "Synchronous Idle", en: "Synchronous Idle" },
  23: { symbol: "ETB", pt: "Fim do bloco de transmissão", en: "End of Transmission Block" },
  24: { symbol: "CAN", pt: "Cancelar (Cancel)", en: "Cancel" },
  25: { symbol: "EM", pt: "Fim da mídia (End of Medium)", en: "End of Medium" },
  26: { symbol: "SUB", pt: "Substituto (Ctrl+Z / SIGTSTP no Unix)", en: "Substitute (Ctrl+Z suspend in Unix)" },
  27: { symbol: "ESC", escape: "\\x1b", pt: "Escape (inicia sequências de cores ANSI no terminal, ex.: \\x1b[32m)", en: "Escape (starts ANSI terminal color/cursor sequences, e.g. \\x1b[32m)" },
  28: { symbol: "FS", pt: "Separador de arquivo (File Separator)", en: "File Separator" },
  29: { symbol: "GS", pt: "Separador de grupo (Group Separator)", en: "Group Separator" },
  30: { symbol: "RS", pt: "Separador de registro (Record Separator)", en: "Record Separator" },
  31: { symbol: "US", pt: "Separador de unidade (Unit Separator)", en: "Unit Separator" },
  127: { symbol: "DEL", pt: "Delete", en: "Delete character" },
}

export const ASCII_TABLE: AsciiEntry[] = Array.from({ length: 128 }, (_, dec) => {
  const hex = `0x${dec.toString(16).toUpperCase().padStart(2, "0")}`
  const oct = dec.toString(8).padStart(3, "0")
  const bin = dec.toString(2).padStart(8, "0")
  const ctrl = CONTROL_CHARS[dec]
  if (ctrl) {
    const isWs = dec === 9 || dec === 10 || dec === 11 || dec === 12 || dec === 13
    return {
      dec,
      hex,
      oct,
      bin,
      symbol: ctrl.symbol,
      escape: ctrl.escape,
      category: isWs ? "whitespace" : "control",
      pt: ctrl.pt,
      en: ctrl.en,
    }
  }
  if (dec === 32) {
    return { dec, hex, oct, bin, symbol: "SPACE", escape: "' '", category: "whitespace", pt: "Espaço em branco padrão", en: "Standard space character" }
  }
  const ch = String.fromCharCode(dec)
  if (dec >= 48 && dec <= 57) {
    return { dec, hex, oct, bin, symbol: ch, category: "digit", pt: `Dígito numérico '${ch}'`, en: `Numeric digit '${ch}'` }
  }
  if (dec >= 65 && dec <= 90) {
    return { dec, hex, oct, bin, symbol: ch, category: "upper", pt: `Letra maiúscula '${ch}' (minúscula = +32 / bit 0x20)`, en: `Uppercase letter '${ch}' (lowercase = +32 / bit 0x20)` }
  }
  if (dec >= 97 && dec <= 122) {
    return { dec, hex, oct, bin, symbol: ch, category: "lower", pt: `Letra minúscula '${ch}' (maiúscula = −32)`, en: `Lowercase letter '${ch}' (uppercase = −32)` }
  }
  return { dec, hex, oct, bin, symbol: ch, category: "punctuation", pt: `Símbolo / pontuação '${ch}'`, en: `Symbol / punctuation '${ch}'` }
})

function normalizeSearch(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

export interface DevRefQuery {
  section?: RefSection
  query?: string
  httpClass?: HttpClass
  onlyCommonAscii?: boolean
}

export interface DevRefResult {
  http: HttpStatusEntry[]
  ports: NetworkPortEntry[]
  mime: MimeTypeEntry[]
  ascii: AsciiEntry[]
  totalMatches: number
}

// Códigos ASCII mais consultados quando não há filtro de busca específico
const HIGHLIGHT_ASCII = new Set([0, 3, 4, 8, 9, 10, 13, 27, 32, 48, 57, 65, 90, 97, 122, 127])

export function queryDevRef(opts: DevRefQuery = {}): DevRefResult {
  const section = opts.section ?? "all"
  const httpClass = opts.httpClass ?? "all"
  const rawQuery = opts.query ?? ""
  const terms = normalizeSearch(rawQuery).split(/\s+/).filter(Boolean)

  const matchAll = (haystack: string) => {
    if (terms.length === 0) return true
    const norm = normalizeSearch(haystack)
    return terms.every((t) => norm.includes(t))
  }

  const http =
    section === "all" || section === "http"
      ? HTTP_CODES.filter((item) => (httpClass === "all" || item.category === httpClass) && matchAll(`${item.code} ${item.phrase} ${item.category} ${item.rfc} ${item.pt} ${item.en}`))
      : []

  const ports =
    section === "all" || section === "ports"
      ? NETWORK_PORTS.filter((item) => matchAll(`${item.port} ${item.protocol} ${item.service} ${item.category} ${item.pt} ${item.en}`))
      : []

  const mime =
    section === "all" || section === "mime"
      ? MIME_TYPES.filter((item) => matchAll(`${item.essence} ${item.extensions.join(" ")} ${item.category} ${item.pt} ${item.en}`))
      : []

  const ascii =
    section === "all" || section === "ascii"
      ? ASCII_TABLE.filter((item) => {
        if (terms.length === 0 && opts.onlyCommonAscii && section === "all") return HIGHLIGHT_ASCII.has(item.dec)
        return matchAll(`${item.dec} ${item.hex} ${item.oct} ${item.bin} ${item.symbol} ${item.escape ?? ""} ${item.category} ${item.pt} ${item.en}`)
      })
      : []

  return {
    http,
    ports,
    mime,
    ascii,
    totalMatches: http.length + ports.length + mime.length + ascii.length,
  }
}
