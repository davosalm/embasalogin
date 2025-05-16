import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";

interface HeaderProps {
  title: string;
  icon: string;
  role: "admin" | "embasa" | "sac";
  username?: string;
  location?: string;
  onLogout: () => void;
}

export default function Header({
  title,
  icon,
  role,
  username = "",
  location = "",
  onLogout
}: HeaderProps) {
  const getBgColorByRole = () => {
    switch (role) {
      case "admin":
        return "bg-blue-800";
      case "embasa":
        return "bg-blue-600";
      case "sac":
        return "bg-green-700";
      default:
        return "bg-gray-800";
    }
  };

  const getTextColorByRole = () => {
    switch (role) {
      case "admin":
        return "text-blue-800";
      case "embasa":
        return "text-blue-600";
      case "sac":
        return "text-green-700";
      default:
        return "text-gray-800";
    }
  };

  const getHoverBgColorByRole = () => {
    switch (role) {
      case "admin":
        return "hover:bg-blue-100";
      case "embasa":
        return "hover:bg-blue-100";
      case "sac":
        return "hover:bg-green-100";
      default:
        return "hover:bg-gray-100";
    }
  };

  return (
    <header className={`${getBgColorByRole()} text-white shadow-md`}>
      <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center">
        <div className="flex items-center mb-4 md:mb-0">
          <span className="material-icons text-3xl mr-2">{icon}</span>
          <h1 className="text-2xl font-bold">{title}</h1>
        </div>
        <div className="flex items-center space-x-4">
          {(username || location) && (
            <div className="flex items-center">
              <span className="material-icons mr-1">person</span>
              <span>{username}</span>
              {location && (
                <span className="ml-2 px-2 py-1 bg-white bg-opacity-20 rounded-full text-xs">
                  {location}
                </span>
              )}
            </div>
          )}
          <ThemeToggle />
          <Button
            variant="outline"
            className={`bg-white ${getTextColorByRole()} ${getHoverBgColorByRole()}`}
            onClick={onLogout}
          >
            <span className="material-icons mr-1">logout</span>
            Sair
          </Button>
        </div>
      </div>
    </header>
  );
}
