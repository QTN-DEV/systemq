import { useState, useEffect } from "react";
import { Download, Calendar, Loader2, Play, Square, Settings2, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { config } from "../../lib/config";
import { toast } from "sonner";

export interface WorkloadSummary {
    total_hours: number;
    total_overtime: number;
    total_billable: number;
    unique_projects: number;
    total_entries: number;
}

export interface WorkloadApiResponse {
    entries: any[];
    pagination: any;
    summary: WorkloadSummary;
}

export interface WorkloadStandupSummary {
    people_has_submitted: string[];
    people_not_submitted: string[];
}

export default function WorkloadTrackingPage() {
    const [summaryData, setSummaryData] = useState<WorkloadApiResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [ongoingProjects, setOngoingProjects] = useState<string[]>([]);
    const [ongoingProjectsLoading, setOngoingProjectsLoading] = useState(true);
    const [standupSummary, setStandupSummary] = useState<WorkloadStandupSummary | null>(null);
    const [standupSummaryLoading, setStandupSummaryLoading] = useState(true);

    // Background Task States
    const [parserStatus, setParserStatus] = useState<any>(null);
    const [crawlerStatus, setCrawlerStatus] = useState<any>(null);
    const [crawlerStartDate, setCrawlerStartDate] = useState("");
    const [crawlerEndDate, setCrawlerEndDate] = useState("");
    const [isCrawlerModalOpen, setIsCrawlerModalOpen] = useState(false);
    const [taskLoading, setTaskLoading] = useState(false);

    useEffect(() => {
        const today = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);

        setEndDate(today.toISOString().split('T')[0]);
        setStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
    }, []);

    const fetchSummaryData = async () => {
        try {
            setLoading(true);

            if (!startDate || !endDate) return;

            const searchParams = new URLSearchParams({
                start_date: startDate,
                end_date: endDate,
                limit: "1",
                offset: "0",
            });

            const response = await fetch(`${config.apiBaseUrl}/workloads/entries?${searchParams.toString()}`);
            if (!response.ok) {
                throw new Error("Failed to fetch summary data");
            }

            const data = await response.json();
            setSummaryData(data);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to fetch summary data');
            console.error('Error fetching summary data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (startDate && endDate) {
            fetchSummaryData();
        }
    }, [startDate, endDate]);

    const fetchOngoingProjects = async () => {
        try {
            setOngoingProjectsLoading(true);

            const response = await fetch(`${config.apiBaseUrl}/workloads/ongoing-projects`);
            if (!response.ok) {
                throw new Error("Failed to fetch ongoing projects");
            }

            const data = await response.json();
            setOngoingProjects(data);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to fetch ongoing projects");
            console.error("Error fetching ongoing projects:", err);
        } finally {
            setOngoingProjectsLoading(false);
        }
    };

    useEffect(() => {
        fetchOngoingProjects();
    }, []);

    const fetchStandupSummary = async () => {
        try {
            setStandupSummaryLoading(true);

            const response = await fetch(`${config.apiBaseUrl}/workloads/standup-summary`);
            if (!response.ok) {
                throw new Error("Failed to fetch standup summary");
            }

            const data = await response.json();
            setStandupSummary(data);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to fetch standup summary");
            console.error("Error fetching standup summary:", err);
        } finally {
            setStandupSummaryLoading(false);
        }
    };

    useEffect(() => {
        fetchStandupSummary();
    }, []);

    // Background Tasks Functions
    const fetchTaskStatus = async () => {
        try {
            const [parserRes, crawlerRes] = await Promise.all([
                fetch(`${config.apiBaseUrl}/background-tasks/parser/status`),
                fetch(`${config.apiBaseUrl}/background-tasks/crawler/status`)
            ]);

            if (parserRes.ok) setParserStatus(await parserRes.json());
            if (crawlerRes.ok) setCrawlerStatus(await crawlerRes.json());
        } catch (err) {
            console.error('Error fetching task status:', err);
        }
    };

    useEffect(() => {
        fetchTaskStatus();
        const interval = setInterval(fetchTaskStatus, 5000);
        return () => clearInterval(interval);
    }, []);

    const toggleParser = async () => {
        try {
            setTaskLoading(true);
            const action = parserStatus?.is_running ? 'stop' : 'start';
            const response = await fetch(`${config.apiBaseUrl}/background-tasks/parser/${action}`, {
                method: 'POST'
            });
            if (response.ok) {
                setParserStatus(await response.json());
                toast.success(`Parser ${action}ed successfully`);
            } else throw new Error();
        } catch (err) {
            toast.error("Failed to toggle parser status");
        } finally {
            setTaskLoading(false);
        }
    };

    const startCrawler = async () => {
        try {
            setTaskLoading(true);
            if (!crawlerStartDate) {
                toast.error("Start date is required to run the crawler");
                return;
            }

            const response = await fetch(`${config.apiBaseUrl}/background-tasks/crawler/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    start_date: crawlerStartDate,
                    end_date: crawlerEndDate || undefined
                })
            });

            if (response.ok) {
                setCrawlerStatus(await response.json());
                toast.success("Crawler started successfully");
                setIsCrawlerModalOpen(false);
            } else throw new Error();
        } catch (err) {
            toast.error("Failed to start crawler");
        } finally {
            setTaskLoading(false);
        }
    };

    const stopCrawler = async () => {
        try {
            setTaskLoading(true);
            const response = await fetch(`${config.apiBaseUrl}/background-tasks/crawler/stop`, {
                method: 'POST'
            });
            if (response.ok) {
                setCrawlerStatus(await response.json());
                toast.success("Crawler stopped successfully");
            } else throw new Error();
        } catch (err) {
            toast.error("Failed to stop crawler");
        } finally {
            setTaskLoading(false);
        }
    };

    const handleDownloadExcel = async () => {
        try {
            setDownloading(true);

            if (!startDate || !endDate) {
                toast.error("Please select both start and end dates");
                return;
            }

            const response = await fetch(`${config.apiBaseUrl}/workloads/export-excel?start_date=${startDate}&end_date=${endDate}`);

            if (!response.ok) {
                throw new Error(`Failed to generate Excel file: ${response.status} ${response.statusText}`);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `workload_report_${startDate}_to_${endDate}.xlsx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to download Excel file');
            console.error('Error downloading Excel:', err);
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto w-full">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Workload Report Dashboard</h1>
                <p className="text-muted-foreground">
                    Generate and download comprehensive workload reports in Excel format
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Daily Parser Status Card */}
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Settings2 className="w-5 h-5 text-muted-foreground" />
                                Standup Parser
                            </CardTitle>
                            {parserStatus && (
                                <Badge variant={parserStatus.is_running ? "default" : "secondary"}>
                                    {parserStatus.is_running ? "Running" : "Stopped"}
                                </Badge>
                            )}
                        </div>
                        <CardDescription>Automatically processes raw slack messages</CardDescription>
                    </CardHeader>
                    <CardContent className="pb-3 text-sm">
                        {parserStatus ? (
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Messages Processed:</span>
                                    <span className="font-medium">{parserStatus.processed_count}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Error Count:</span>
                                    <span className="font-medium text-red-500">{parserStatus.error_count}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Loader2 className="w-4 h-4 animate-spin" /> Loading status...
                            </div>
                        )}
                    </CardContent>
                    <CardFooter>
                        <Button
                            variant={parserStatus?.is_running ? "destructive" : "default"}
                            className="w-full"
                            onClick={toggleParser}
                            disabled={!parserStatus || taskLoading}
                        >
                            {parserStatus?.is_running ? (
                                <><Square className="w-4 h-4 mr-2" /> Stop Parser</>
                            ) : (
                                <><Play className="w-4 h-4 mr-2" /> Start Parser</>
                            )}
                        </Button>
                    </CardFooter>
                </Card>

                {/* History Crawler Status Card */}
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <RefreshCw className="w-5 h-5 text-muted-foreground" />
                                History Crawler
                            </CardTitle>
                            {crawlerStatus && (
                                <Badge variant={crawlerStatus.is_running ? "default" : "secondary"}>
                                    {crawlerStatus.is_running ? "Running" : "Idle"}
                                </Badge>
                            )}
                        </div>
                        <CardDescription>Fetches historical message records from Slack</CardDescription>
                    </CardHeader>
                    <CardContent className="pb-3 text-sm">
                        {crawlerStatus ? (
                            <div className="space-y-2">
                                <div className="flex flex-col gap-1">
                                    <span className="text-muted-foreground">Current Status:</span>
                                    <span className="font-medium text-xs bg-muted p-2 rounded-md truncate">
                                        {crawlerStatus.status_message}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Loader2 className="w-4 h-4 animate-spin" /> Loading status...
                            </div>
                        )}
                    </CardContent>
                    <CardFooter>
                        {crawlerStatus?.is_running ? (
                            <Button
                                variant="destructive"
                                className="w-full"
                                onClick={stopCrawler}
                                disabled={taskLoading}
                            >
                                <Square className="w-4 h-4 mr-2" /> Stop Crawler
                            </Button>
                        ) : (
                            <Dialog open={isCrawlerModalOpen} onOpenChange={setIsCrawlerModalOpen}>
                                <DialogTrigger asChild>
                                    <Button className="w-full" disabled={!crawlerStatus || taskLoading}>
                                        <Play className="w-4 h-4 mr-2" /> Start Crawler
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Start History Crawler</DialogTitle>
                                        <DialogDescription>
                                            Fetch historical standup messages from configured Slack channels.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Start Date (Required)</label>
                                            <Input
                                                type="date"
                                                value={crawlerStartDate}
                                                onChange={(e) => setCrawlerStartDate(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">End Date (Optional)</label>
                                            <Input
                                                type="date"
                                                value={crawlerEndDate}
                                                onChange={(e) => setCrawlerEndDate(e.target.value)}
                                            />
                                            <p className="text-xs text-muted-foreground">Leaves blank to fetch up to current time</p>
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setIsCrawlerModalOpen(false)}>Cancel</Button>
                                        <Button onClick={startCrawler} disabled={!crawlerStartDate || taskLoading}>
                                            {taskLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                                            Start Fetching
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        )}
                    </CardFooter>
                </Card>
            </div>

            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>Report Configuration</CardTitle>
                    <CardDescription>Select the date range for your report</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row gap-4 items-end">
                        <div className="flex-1 space-y-2">
                            <label className="text-sm font-medium">
                                Start Date
                            </label>
                            <div className="relative">
                                <Input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full pl-10"
                                />
                                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            </div>
                        </div>

                        <div className="flex-1 space-y-2">
                            <label className="text-sm font-medium">
                                End Date
                            </label>
                            <div className="relative">
                                <Input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full pl-10"
                                />
                                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            </div>
                        </div>

                        <div className="flex-1">
                            <Button
                                size="lg"
                                onClick={handleDownloadExcel}
                                disabled={!startDate || !endDate || downloading}
                                className="w-full flex items-center gap-2"
                            >
                                {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                {downloading ? "Generating..." : "Download Excel Report"}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {summaryData && (
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>Report Summary</CardTitle>
                        <CardDescription>
                            Data from {startDate} to {endDate}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex justify-center items-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                <span className="ml-3 text-muted-foreground">Loading summary...</span>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                                <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900 flex flex-col items-center justify-center text-center">
                                    <p className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-1">{summaryData.summary.total_hours}h</p>
                                    <p className="text-sm font-medium text-blue-900/60 dark:text-blue-300">Total Hours</p>
                                </div>
                                <div className="p-6 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-100 dark:border-orange-900 flex flex-col items-center justify-center text-center">
                                    <p className="text-4xl font-bold text-orange-600 dark:text-orange-400 mb-1">{summaryData.summary.total_overtime}h</p>
                                    <p className="text-sm font-medium text-orange-900/60 dark:text-orange-300">Overtime</p>
                                </div>
                                <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-900 flex flex-col items-center justify-center text-center">
                                    <p className="text-4xl font-bold text-green-600 dark:text-green-400 mb-1">{summaryData.summary.total_billable}h</p>
                                    <p className="text-sm font-medium text-green-900/60 dark:text-green-300">Billable</p>
                                </div>
                                <div className="p-6 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-100 dark:border-purple-900 flex flex-col items-center justify-center text-center">
                                    <p className="text-4xl font-bold text-purple-600 dark:text-purple-400 mb-1">{summaryData.summary.unique_projects}</p>
                                    <p className="text-sm font-medium text-purple-900/60 dark:text-purple-300">Projects</p>
                                </div>
                                <div className="p-6 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center text-center">
                                    <p className="text-4xl font-bold text-zinc-700 dark:text-zinc-300 mb-1">{summaryData.summary.total_entries}</p>
                                    <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Total Entries</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            <Card className="mb-6">
                <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <CardTitle>Ongoing Projects</CardTitle>
                            <CardDescription>
                                Active mapped projects detected from the last 7 days
                            </CardDescription>
                        </div>
                        <Badge variant="secondary">{ongoingProjects.length}</Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    {ongoingProjectsLoading ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Loading ongoing projects...
                        </div>
                    ) : ongoingProjects.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {ongoingProjects.map((projectName) => (
                                <div
                                    key={projectName}
                                    className="rounded-lg border bg-card px-4 py-3"
                                >
                                    <p className="font-medium">{projectName}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            No ongoing projects found in the last 7 days.
                        </p>
                    )}
                </CardContent>
            </Card>

            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>Today's Standup Summary</CardTitle>
                    <CardDescription>
                        Compared against members in the monitored Slack channel
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {standupSummaryLoading ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Loading standup summary...
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="rounded-lg border bg-card p-4">
                                <div className="mb-3 flex items-center justify-between gap-3">
                                    <h3 className="font-medium">Submitted</h3>
                                    <Badge>{standupSummary?.people_has_submitted.length ?? 0}</Badge>
                                </div>
                                {standupSummary?.people_has_submitted.length ? (
                                    <div className="space-y-2">
                                        {standupSummary.people_has_submitted.map((person) => (
                                            <div key={person} className="rounded-md bg-muted px-3 py-2 text-sm">
                                                {person}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">No submissions found today.</p>
                                )}
                            </div>

                            <div className="rounded-lg border bg-card p-4">
                                <div className="mb-3 flex items-center justify-between gap-3">
                                    <h3 className="font-medium">Not Submitted</h3>
                                    <Badge variant="secondary">{standupSummary?.people_not_submitted.length ?? 0}</Badge>
                                </div>
                                {standupSummary?.people_not_submitted.length ? (
                                    <div className="space-y-2">
                                        {standupSummary.people_not_submitted.map((person) => (
                                            <div key={person} className="rounded-md bg-muted px-3 py-2 text-sm">
                                                {person}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">Everyone has submitted standup.</p>
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>How to Use</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4 text-sm text-muted-foreground">
                        <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">1</div>
                            <p className="pt-0.5">Select your desired date range using the start and end date inputs above.</p>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">2</div>
                            <p className="pt-0.5">Click the "Download Excel Report" button to generate your workload report.</p>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">3</div>
                            <p className="pt-0.5">The Excel file will contain columns: No, Tanggal, Nama, Project Hours, Project Percentages, and Total Hours.</p>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">4</div>
                            <p className="pt-0.5">The report will be automatically downloaded to your device when ready.</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
