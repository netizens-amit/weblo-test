import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Code, Zap, Globe } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch } from "@/store/hooks";
import { createProject } from "@/store/slices/projectSlice";

export function LandingPage() {
  const [prompt, setPrompt] = useState("");
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const handleGenerate = async () => {
    if (prompt.trim()) {
      try {
        const project = await dispatch(createProject({ name: "New Website", prompt })).unwrap();
        navigate(`/project/${project.id}`);
      } catch (error) {
        console.error("Failed to create project:", error);
      }
    }
  };

  const handlePromptBuilder = () => {
    navigate('/prompt-builder');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code className="h-8 w-8" />
            <span className="text-2xl font-bold">Weblo.</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#solutions" className="text-sm font-medium hover:text-primary">
              Solutions
            </a>
            <a href="#library" className="text-sm font-medium hover:text-primary">
              Library
            </a>
            <a href="#resources" className="text-sm font-medium hover:text-primary">
              Resources
            </a>
            <a href="#help" className="text-sm font-medium hover:text-primary">
              Help Center
            </a>
          </nav>
          <Button variant="default">Sign In</Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
            Build Your Website
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              in Minutes with AI
            </span>
          </h1>

          {/* Prompt Input */}
          <Card className="max-w-3xl mx-auto">
            <CardContent className="p-6">
              <Textarea
                placeholder="Create a website for my bakery called SweetCrust. We sell fresh pastries and custom cakes. Our customers are local families and office workers. Make the tone warm and friendly, and focus on helping customers place custom cake orders easily."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[120px] resize-none"
              />
              <div className="flex items-center justify-between mt-4">
                <Button variant="outline" size="sm" onClick={handlePromptBuilder}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Prompt Builder
                </Button>
                <Button onClick={handleGenerate} size="lg">
                  Generate Website
                  <Zap className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 mt-16">
            <Card>
              <CardContent className="p-6 space-y-2">
                <div className="h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <Code className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-semibold text-lg">AI-Powered</h3>
                <p className="text-sm text-muted-foreground">
                  Generate complete, production-ready websites from simple prompts
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 space-y-2">
                <div className="h-12 w-12 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                  <Zap className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="font-semibold text-lg">Lightning Fast</h3>
                <p className="text-sm text-muted-foreground">
                  Watch your website come to life in real-time with live preview
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 space-y-2">
                <div className="h-12 w-12 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <Globe className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="font-semibold text-lg">Fully Editable</h3>
                <p className="text-sm text-muted-foreground">
                  Edit code in real-time and see changes instantly
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Ready to Use Templates */}
      <section className="container mx-auto px-4 py-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold">Ready to use templates</h2>
          <Button variant="outline" onClick={() => navigate('/projects')}>View All</Button>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="h-48 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900" />
              <CardContent className="p-4">
                <h3 className="font-semibold">Template {i}</h3>
                <p className="text-sm text-muted-foreground">
                  Modern and responsive design
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
