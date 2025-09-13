import { Zap } from "lucide-react";

export const Header = () => {
  return (
    <header className="w-full py-6 px-4">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-soft">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold gradient-text">CleanShot</h1>
            <p className="text-sm text-muted-foreground">Remove Gemini watermarks in a flash</p>
          </div>
        </div>
        
        <nav className="hidden md:flex gap-6 text-sm text-muted-foreground">
          <a href="#about" className="hover:text-foreground transition-colors">About</a>
          <a href="#privacy" className="hover:text-foreground transition-colors">Privacy</a>
        </nav>
      </div>
    </header>
  );
};