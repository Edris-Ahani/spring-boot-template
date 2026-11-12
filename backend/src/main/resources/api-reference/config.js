Scalar.createApiReference("#foundry-api-reference", {
  url: new URL("openapi.yaml", document.currentScript.src).href,
  theme: "default",
  layout: "modern",
  withDefaultFonts: false,
  hideClientButton: true,
  showDeveloperTools: "never",
  persistAuth: false,
  telemetry: false,
  proxyUrl: "",
  agent: { disabled: true },
  defaultHttpClient: { targetKey: "shell", clientKey: "curl" },
});
