import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { LandingPage } from "./pages/LandingPage";
import { EditorPage } from "./pages/EditorPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import PromptBuilder from "./components/prompt-builder/PromptBuilder";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/prompt-builder" element={<PromptBuilder />} />
          <Route path="/project/:projectId" element={<EditorPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
        </Routes>
      </Router>
      <Toaster position="bottom-right" />
    </QueryClientProvider>
  );
}

export default App;
