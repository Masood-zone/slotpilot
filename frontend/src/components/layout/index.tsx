import { Link, Outlet } from "react-router-dom";
import { Toaster } from "sonner";

function RootLayout() {
  return (
    <>
      {/* Navbar */}
      <Link to="/" aria-label="SlotPilot home">
        <header className="flex items-center p-5 hover:cursor-pointer">
          <span className="brand-lockup h-12 w-[200px]" aria-hidden="true" />
          <span className="sr-only">SlotPilot</span>
        </header>
      </Link>

      <main className="">
        <Outlet />
      </main>
      <Toaster />
    </>
  );
}

export default RootLayout;
