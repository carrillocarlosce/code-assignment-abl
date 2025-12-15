export type ConnectionStatus = "connecting" | "connected" | "disconnected";

interface ConnectionStatusProps {
  status: ConnectionStatus;
}

// Helper function to get status styles
const getStatusStyles = (status: ConnectionStatus) => {
  switch (status) {
    case "connected":
      return "bg-green-500/20 text-green-400 border-green-500/50";
    case "connecting":
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
    case "disconnected":
      return "bg-red-500/20 text-red-400 border-red-500/50";
  }
};

const getStatusText = (status: ConnectionStatus) => {
  switch (status) {
    case "connected":
      return "Connected";
    case "connecting":
      return "Connecting...";
    case "disconnected":
      return "Disconnected";
  }
};

export default function ConnectionStatus({ status }: ConnectionStatusProps) {
  return (
    <div
      className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${getStatusStyles(
        status
      )}`}
    >
      <div
        className={`w-2 h-2 rounded-full ${
          status === "connected"
            ? "bg-green-400 animate-pulse"
            : status === "connecting"
            ? "bg-yellow-400 animate-pulse"
            : "bg-red-400"
        }`}
      />
      <span className="text-sm font-semibold">{getStatusText(status)}</span>
    </div>
  );
}

