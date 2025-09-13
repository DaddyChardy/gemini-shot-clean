export const Footer = () => {
  return (
    <footer className="w-full py-8 px-4 mt-16 border-t border-border/50">
      <div className="container mx-auto text-center space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-muted-foreground">
          <a href="#about" className="hover:text-foreground transition-colors">
            About CleanShot
          </a>
          <a href="#privacy" className="hover:text-foreground transition-colors">
            Privacy Policy
          </a>
          <a href="#terms" className="hover:text-foreground transition-colors">
            Terms of Service
          </a>
          <a href="#contact" className="hover:text-foreground transition-colors">
            Contact
          </a>
        </div>
        
        <div className="text-xs text-muted-foreground">
          <p>© 2025 CleanShot. All rights reserved.</p>
          <p className="mt-1">
            Powered by advanced AI inpainting technology. Images are automatically deleted after processing.
          </p>
        </div>
      </div>
    </footer>
  );
};