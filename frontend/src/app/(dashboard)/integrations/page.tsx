export default function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Integrations</h1>
        <p className="text-gray-500 text-sm mt-1">Connect your chatbot to external tools</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {[
          {
            name: "n8n",
            description: "Automate workflows: escalation alerts, daily reports, CRM sync",
            icon: "⚡",
            status: "available",
            docsUrl: "/docs/n8n-setup.md",
          },
          {
            name: "Webhooks",
            description: "Receive POST events when new conversations start or escalate",
            icon: "🔗",
            status: "available",
            docsUrl: "/docs/api-reference.md",
          },
          {
            name: "Zapier",
            description: "Connect to 3000+ apps via Zapier triggers",
            icon: "⚡",
            status: "coming-soon",
          },
          {
            name: "Slack",
            description: "Get notified in Slack when a conversation needs human support",
            icon: "💬",
            status: "coming-soon",
          },
        ].map((integration) => (
          <div key={integration.name} className="bg-white rounded-xl border p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{integration.icon}</span>
                <div>
                  <h3 className="font-semibold">{integration.name}</h3>
                  <p className="text-sm text-gray-500">{integration.description}</p>
                </div>
              </div>
              {integration.status === "available" ? (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                  Available
                </span>
              ) : (
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
                  Coming Soon
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-indigo-50 rounded-xl border border-indigo-200 p-6">
        <h2 className="font-semibold mb-2">Webhook Endpoint</h2>
        <p className="text-sm text-gray-600 mb-3">
          Configure n8n or any automation tool to use this endpoint:
        </p>
        <code className="text-sm bg-white px-3 py-2 rounded border block">
          POST /api/webhooks/n8n
        </code>
      </div>
    </div>
  );
}
