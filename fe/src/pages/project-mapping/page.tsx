import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Loader2, Network } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "../../components/ui/dialog";
import { config } from "../../lib/config";
import { toast } from "sonner";

export interface ProjectMapping {
    id: string;
    project_name: string;
    mapped_names: string[];
    created_at: string;
    updated_at: string;
}

export default function ProjectMappingPage() {
    const [mappings, setMappings] = useState<ProjectMapping[]>([]);
    const [distinctNames, setDistinctNames] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState("");

    const [isOpen, setIsOpen] = useState(false);
    const [newProjectName, setNewProjectName] = useState("");
    const [selectedNames, setSelectedNames] = useState<string[]>([]);
    const [editingMapping, setEditingMapping] = useState<ProjectMapping | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setIsLoading(true);
            const [mappingsRes, namesRes] = await Promise.all([
                fetch(`${config.apiBaseUrl}/api/project-mapping/mappings`),
                fetch(`${config.apiBaseUrl}/api/project-mapping/distinct-names`),
            ]);

            if (!mappingsRes.ok || !namesRes.ok) {
                throw new Error("Failed to load project mappings data");
            }

            const mappingsData = await mappingsRes.json();
            const namesData = await namesRes.json();

            setMappings(mappingsData);
            setDistinctNames(namesData);
        } catch (error) {
            console.error("Failed to load data:", error);
            toast.error("Failed to load data");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateMapping = async () => {
        if (!newProjectName.trim() || selectedNames.length === 0) {
            return;
        }

        try {
            setIsCreating(true);
            setError("");

            const payload = {
                project_name: newProjectName.trim(),
                mapped_names: selectedNames,
            };

            const url = editingMapping
                ? `${config.apiBaseUrl}/api/project-mapping/mappings/${editingMapping.id}`
                : `${config.apiBaseUrl}/api/project-mapping/mappings`;

            const response = await fetch(url, {
                method: editingMapping ? "PUT" : "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || "Failed to save Project mapping");
            }

            toast.success(`Project mapping ${editingMapping ? "updated" : "created"} successfully`);
            await loadData();
            resetForm();
            setIsOpen(false);
        } catch (error: any) {
            console.error("Failed to save mapping:", error);
            const errorMessage = error.message || "Failed to save Project mapping";

            if (errorMessage.includes("already mapped to other Projects")) {
                setError(
                    "Some project names are already assigned to other Projects. Each project name can only belong to one Project.",
                );
            } else {
                setError(errorMessage);
            }
        } finally {
            setIsCreating(false);
        }
    };

    const handleEditMapping = (mapping: ProjectMapping) => {
        setEditingMapping(mapping);
        setNewProjectName(mapping.project_name);
        setSelectedNames(mapping.mapped_names);
        setIsOpen(true);
    };

    const handleDeleteMapping = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this project mapping?")) {
            return;
        }

        try {
            const response = await fetch(`${config.apiBaseUrl}/api/project-mapping/mappings/${id}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                throw new Error("Failed to delete mapping");
            }

            toast.success("Project mapping deleted successfully");
            await loadData();
        } catch (error) {
            console.error("Failed to delete mapping:", error);
            toast.error("Failed to delete mapping");
        }
    };

    const resetForm = () => {
        setNewProjectName("");
        setSelectedNames([]);
        setEditingMapping(null);
        setError("");
    };

    const handleOpenCreate = () => {
        resetForm();
        setIsOpen(true);
    };

    const getAvailableNames = () => {
        const usedNames = mappings
            .filter((m) => !editingMapping || m.id !== editingMapping.id)
            .flatMap((m) => m.mapped_names);

        return distinctNames.filter((name) => !usedNames.includes(name));
    };

    const handleNameToggle = (name: string) => {
        setSelectedNames((prev) =>
            prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
        );
    };

    return (
        <div className="p-6 max-w-5xl mx-auto w-full">
            <div className="mb-8 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                        <Network className="h-8 w-8 text-primary" /> Project Mapping
                    </h1>
                    <p className="text-muted-foreground">
                        Organize project_name entries from your Slack data into consolidated Projects.
                        <br />
                        Each project_name can only belong to one Project.
                    </p>
                </div>
                <Button onClick={handleOpenCreate} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" /> Create New Project
                </Button>
            </div>

            <div className="mb-6 p-4 bg-muted rounded-lg flex items-center justify-between">
                <p className="text-sm font-medium">
                    {distinctNames.length} distinct project names found from Slack.{" "}
                    <span className="text-primary font-bold">{getAvailableNames().length}</span> available for grouping.
                </p>
            </div>

            {isLoading ? (
                <div className="grid gap-4">
                    {[1, 2, 3].map((i) => (
                        <Card key={i} className="animate-pulse">
                            <CardContent className="p-6">
                                <div className="h-4 bg-muted rounded w-1/3 mb-4" />
                                <div className="h-3 bg-muted rounded w-2/3" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                    {mappings.length === 0 ? (
                        <Card className="lg:col-span-2">
                            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                                <Network className="h-12 w-12 text-muted-foreground/50 mb-4" />
                                <h3 className="text-lg font-bold mb-2">No Project Mappings Created</h3>
                                <p className="text-muted-foreground max-w-sm mb-4">
                                    Create your first Project to group related project_name entries together.
                                </p>
                                <p className="text-xs text-muted-foreground/80 bg-muted p-2 rounded max-w-md text-left">
                                    For example: Group "slack-bot-dev", "slack-bot-testing" → "Slack Bot Development"
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        mappings.map((mapping) => (
                            <Card key={mapping.id} className="transition-all hover:shadow-md">
                                <CardHeader className="flex flex-row items-start justify-between pb-2">
                                    <div className="space-y-1">
                                        <CardTitle className="text-xl">{mapping.project_name}</CardTitle>
                                        <CardDescription>
                                            Created: {new Date(mapping.created_at).toLocaleDateString()}
                                        </CardDescription>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleEditMapping(mapping)}
                                        >
                                            <Edit2 className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50"
                                            onClick={() => handleDeleteMapping(mapping.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {mapping.mapped_names.map((name) => (
                                            <Badge key={name} variant="secondary">
                                                {name}
                                            </Badge>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            )}

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>{editingMapping ? "Edit Project Mapping" : "Create New Project Mapping"}</DialogTitle>
                        <DialogDescription>
                            Group multiple project names under one Project. Each project name can only belong to one Project.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-6 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                Project Name
                            </label>
                            <Input
                                placeholder="Enter the main project name (e.g., 'Slack Bot Development')"
                                value={newProjectName}
                                onChange={(e) => setNewProjectName(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                This is the consolidated project name that will group multiple project_name entries
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none">
                                Select Project Names to Group
                            </label>
                            <p className="text-xs text-muted-foreground mb-2">
                                Choose from available project_name entries found in your Slack data.
                            </p>

                            <div className="border rounded-md p-4 max-h-[300px] overflow-y-auto bg-muted/30">
                                {getAvailableNames().length === 0 && !editingMapping ? (
                                    <p className="text-muted-foreground text-sm py-4 text-center">
                                        No available project names to group. All project names are already assigned.
                                    </p>
                                ) : (
                                    <div className="flex flex-col gap-2">
                                        {getAvailableNames().map((name) => (
                                            <div
                                                key={name}
                                                onClick={() => handleNameToggle(name)}
                                                className={`p-3 rounded-md cursor-pointer transition-colors flex items-center gap-3 border ${selectedNames.includes(name)
                                                    ? "bg-primary/10 border-primary shadow-sm"
                                                    : "bg-background border-border hover:border-primary/50"
                                                    }`}
                                            >
                                                <div className={`w-4 h-4 rounded-sm border flex items-center justify-center ${selectedNames.includes(name) ? "bg-primary border-primary" : "border-primary/50"
                                                    }`}>
                                                    {selectedNames.includes(name) && <div className="w-2 h-2 bg-primary-foreground rounded-sm" />}
                                                </div>
                                                <span className="text-sm font-medium">{name}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {selectedNames.length > 0 && (
                            <div className="space-y-2 bg-muted/50 p-4 rounded-lg">
                                <p className="text-sm font-medium">
                                    Selected project names ({selectedNames.length}):
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {selectedNames.map((name) => (
                                        <Badge
                                            key={name}
                                            variant="default"
                                            className="cursor-pointer pr-1"
                                            onClick={() => handleNameToggle(name)}
                                        >
                                            {name}
                                            <span className="ml-1 opacity-70 hover:opacity-100">×</span>
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-md">
                                <p className="text-red-600 dark:text-red-400 text-sm font-medium">{error}</p>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            disabled={!newProjectName.trim() || selectedNames.length === 0 || isCreating}
                            onClick={handleCreateMapping}
                        >
                            {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {editingMapping ? "Update Project Mapping" : "Create Project Mapping"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
