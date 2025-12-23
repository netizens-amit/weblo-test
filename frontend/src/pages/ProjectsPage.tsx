import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { FolderOpen, FileText, AlertCircle, RefreshCw } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchProjects, deleteProject } from "@/store/slices/projectSlice";

export function ProjectsPage() {
  const dispatch = useAppDispatch();
  const { projects, loading, error } = useAppSelector((state) => state.project);
  const navigate = useNavigate();

  useEffect(() => {
    dispatch(fetchProjects());
  }, [dispatch]);

  console.log("Projects : ", projects);
  const openProject = (id: string) => {
    navigate(`/project/${id}`);
  };

  const handleDeleteProject = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this project?")) {
      await dispatch(deleteProject(id));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FolderOpen className="h-6 w-6" />
            Projects
          </h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => dispatch(fetchProjects())} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" onClick={() => navigate("/")}>
              New Project
            </Button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <div className="flex-1">
              <p className="text-red-700 dark:text-red-300 font-medium">Failed to load projects</p>
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => dispatch(fetchProjects())}>
              Retry
            </Button>
          </div>
        )}

        {/* Loading State */}
        {loading && projects.length === 0 && (
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4 space-y-3">
                  <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                  <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Projects Grid */}
        {projects.length > 0 && (
          <div className="grid md:grid-cols-3 gap-6">
            {projects.map((p) => (
              <Card key={p.id} className="hover:shadow transition-shadow">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{p.name || "Generated Website"}</h3>
                      <div className="text-xs text-slate-500">
                        {p.createdAt ? new Date(p.createdAt).toLocaleString() : 'Date unknown'}
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      p.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                      p.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                      p.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-slate-200 text-slate-700'
                    }`}>
                      {p.status}
                    </span>
                  </div>
                  <div className="text-sm text-slate-600 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span>{p.versions?.length ?? 0} versions</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => openProject(p.id)}>
                      Open
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openProject(p.id)}>
                      Edit with AI
                    </Button>
                    <Button size="sm" className="flex justify-end" variant="outline" onClick={() => handleDeleteProject(p.id)}>
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && projects.length === 0 && (
          <div className="text-center py-12">
            <FolderOpen className="h-12 w-12 mx-auto text-slate-400 mb-4" />
            <h3 className="text-lg font-medium text-slate-600 dark:text-slate-300 mb-2">
              No projects yet
            </h3>
            <p className="text-slate-500 mb-4">
              Create your first project from the landing page.
            </p>
            <Button onClick={() => navigate("/")}>
              Create New Project
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
