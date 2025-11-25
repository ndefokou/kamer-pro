import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, Building2, Users, LogOut } from "lucide-react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8082";

interface Architect {
    id: number;
    name: string;
    created_at: string;
}

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [architects, setArchitects] = useState<Architect[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const adminUsername = localStorage.getItem("adminUsername");
    const adminToken = localStorage.getItem("adminToken");

    useEffect(() => {
        if (!adminToken) {
            navigate("/admin-login");
            return;
        }
        fetchArchitects();
    }, [adminToken, navigate]);

    const fetchArchitects = async () => {
        setIsLoading(true);
        try {
            const response = await axios.get(`${API_URL}/api/admin/architects`, {
                headers: { Authorization: `Bearer ${adminToken}` },
            });
            setArchitects(response.data);
        } catch (error) {
            console.error("Failed to fetch architects:", error);
            if (axios.isAxiosError(error) && error.response?.status === 401) {
                navigate("/admin-login");
            }
            toast({
                title: "Error",
                description: "Failed to fetch architects",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("adminToken");
        localStorage.removeItem("adminId");
        localStorage.removeItem("adminUsername");
        navigate("/admin-login");
    };

    const recentArchitects = architects
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
                        <p className="text-muted-foreground">
                            Welcome back, {adminUsername}
                        </p>
                    </div>
                    <Button variant="outline" onClick={handleLogout}>
                        <LogOut className="h-4 w-4 mr-2" />
                        Logout
                    </Button>
                </div>

                {/* Stats Cards */}
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Total Architects
                            </CardTitle>
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{architects.length}</div>
                            <p className="text-xs text-muted-foreground">
                                Registered architect firms
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Active Architects
                            </CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {architects.filter((a: any) => a.is_active === 1).length}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Currently active accounts
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                This Month
                            </CardTitle>
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {
                                    architects.filter((a) => {
                                        const createdDate = new Date(a.created_at);
                                        const now = new Date();
                                        return (
                                            createdDate.getMonth() === now.getMonth() &&
                                            createdDate.getFullYear() === now.getFullYear()
                                        );
                                    }).length
                                }
                            </div>
                            <p className="text-xs text-muted-foreground">
                                New architects this month
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Quick Actions */}
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid md:grid-cols-2 gap-4">
                            <Button
                                onClick={() => navigate("/admin/architects")}
                                className="h-20"
                                variant="outline"
                            >
                                <Building2 className="h-6 w-6 mr-2" />
                                Manage Architects
                            </Button>
                            <Button
                                onClick={() => navigate("/admin/architects")}
                                className="h-20"
                            >
                                <Users className="h-6 w-6 mr-2" />
                                Create New Architect
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Architects */}
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Architects</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {recentArchitects.length === 0 ? (
                            <p className="text-muted-foreground text-center py-8">
                                No architects registered yet
                            </p>
                        ) : (
                            <div className="space-y-4">
                                {recentArchitects.map((architect) => (
                                    <div
                                        key={architect.id}
                                        className="flex items-center justify-between p-4 border rounded-lg"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="bg-primary/10 p-3 rounded-full">
                                                <Building2 className="h-5 w-5 text-primary" />
                                            </div>
                                            <div>
                                                <p className="font-medium">{architect.name}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    Registered {new Date(architect.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => navigate("/admin/architects")}
                                        >
                                            View
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default AdminDashboard;
