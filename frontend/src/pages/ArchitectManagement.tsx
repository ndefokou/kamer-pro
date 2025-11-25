import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Edit, Trash2, Key, Building2 } from "lucide-react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8082";

interface Architect {
    id: number;
    name: string;
    email: string;
    phone: string;
    location: string;
    registration_number?: string;
    is_active?: number;
    created_at: string;
}

const ArchitectManagement = () => {
    const navigate = useNavigate();
    const [architects, setArchitects] = useState<Architect[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
    const [selectedArchitect, setSelectedArchitect] = useState<Architect | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const [createFormData, setCreateFormData] = useState({
        name: "",
        email: "",
        phone: "",
        location: "",
        registration_number: "",
        password: "",
    });

    const [editFormData, setEditFormData] = useState({
        name: "",
        email: "",
        phone: "",
        location: "",
        registration_number: "",
        is_active: true,
    });

    const [newPassword, setNewPassword] = useState("");

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

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            await axios.post(`${API_URL}/api/admin/architects`, createFormData, {
                headers: { Authorization: `Bearer ${adminToken}` },
            });

            toast({
                title: "Success",
                description: "Architect created successfully",
            });

            setIsCreateOpen(false);
            setCreateFormData({
                name: "",
                email: "",
                phone: "",
                location: "",
                registration_number: "",
                password: "",
            });
            fetchArchitects();
        } catch (error) {
            let errorMessage = "Failed to create architect";
            if (axios.isAxiosError(error) && error.response) {
                errorMessage = error.response.data.message || error.message;
            }
            toast({
                title: "Error",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedArchitect) return;

        setIsSaving(true);

        try {
            await axios.put(
                `${API_URL}/api/admin/architects/${selectedArchitect.id}`,
                editFormData,
                {
                    headers: { Authorization: `Bearer ${adminToken}` },
                }
            );

            toast({
                title: "Success",
                description: "Architect updated successfully",
            });

            setIsEditOpen(false);
            setSelectedArchitect(null);
            fetchArchitects();
        } catch (error) {
            let errorMessage = "Failed to update architect";
            if (axios.isAxiosError(error) && error.response) {
                errorMessage = error.response.data.message || error.message;
            }
            toast({
                title: "Error",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: number, name: string) => {
        if (!confirm(`Are you sure you want to delete ${name}?`)) return;

        try {
            await axios.delete(`${API_URL}/api/admin/architects/${id}`, {
                headers: { Authorization: `Bearer ${adminToken}` },
            });

            toast({
                title: "Success",
                description: "Architect deleted successfully",
            });

            fetchArchitects();
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to delete architect",
                variant: "destructive",
            });
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedArchitect) return;

        setIsSaving(true);

        try {
            await axios.post(
                `${API_URL}/api/admin/architects/${selectedArchitect.id}/reset-password`,
                { new_password: newPassword },
                {
                    headers: { Authorization: `Bearer ${adminToken}` },
                }
            );

            toast({
                title: "Success",
                description: "Password reset successfully",
            });

            setIsResetPasswordOpen(false);
            setSelectedArchitect(null);
            setNewPassword("");
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to reset password",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const openEditDialog = (architect: Architect) => {
        setSelectedArchitect(architect);
        setEditFormData({
            name: architect.name,
            email: architect.email,
            phone: architect.phone,
            location: architect.location,
            registration_number: architect.registration_number || "",
            is_active: architect.is_active === 1,
        });
        setIsEditOpen(true);
    };

    const openResetPasswordDialog = (architect: Architect) => {
        setSelectedArchitect(architect);
        setNewPassword("");
        setIsResetPasswordOpen(true);
    };

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
                        <h1 className="text-3xl font-bold mb-2">Architect Management</h1>
                        <p className="text-muted-foreground">
                            Manage architect profiles and credentials
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => navigate("/admin/dashboard")}>
                            Dashboard
                        </Button>
                        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create Architect
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>Create New Architect</DialogTitle>
                                    <DialogDescription>
                                        Add a new architect firm to the platform
                                    </DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleCreate} className="space-y-4">
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="create-name">Firm Name *</Label>
                                            <Input
                                                id="create-name"
                                                value={createFormData.name}
                                                onChange={(e) =>
                                                    setCreateFormData({ ...createFormData, name: e.target.value })
                                                }
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="create-email">Email *</Label>
                                            <Input
                                                id="create-email"
                                                type="email"
                                                value={createFormData.email}
                                                onChange={(e) =>
                                                    setCreateFormData({ ...createFormData, email: e.target.value })
                                                }
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="create-phone">Phone *</Label>
                                            <Input
                                                id="create-phone"
                                                type="tel"
                                                value={createFormData.phone}
                                                onChange={(e) =>
                                                    setCreateFormData({ ...createFormData, phone: e.target.value })
                                                }
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="create-location">Location *</Label>
                                            <Input
                                                id="create-location"
                                                value={createFormData.location}
                                                onChange={(e) =>
                                                    setCreateFormData({ ...createFormData, location: e.target.value })
                                                }
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="create-registration">Registration Number *</Label>
                                            <Input
                                                id="create-registration"
                                                value={createFormData.registration_number}
                                                onChange={(e) =>
                                                    setCreateFormData({
                                                        ...createFormData,
                                                        registration_number: e.target.value,
                                                    })
                                                }
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="create-password">Password *</Label>
                                            <Input
                                                id="create-password"
                                                type="password"
                                                value={createFormData.password}
                                                onChange={(e) =>
                                                    setCreateFormData({ ...createFormData, password: e.target.value })
                                                }
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setIsCreateOpen(false)}
                                        >
                                            Cancel
                                        </Button>
                                        <Button type="submit" disabled={isSaving}>
                                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Create Architect
                                        </Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>All Architects ({architects.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {architects.length === 0 ? (
                            <div className="text-center py-12">
                                <Building2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                                <p className="text-muted-foreground mb-4">No architects yet</p>
                                <Button onClick={() => setIsCreateOpen(true)}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create First Architect
                                </Button>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Firm Name</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Phone</TableHead>
                                            <TableHead>Location</TableHead>
                                            <TableHead>Registration #</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {architects.map((architect) => (
                                            <TableRow key={architect.id}>
                                                <TableCell className="font-medium">{architect.name}</TableCell>
                                                <TableCell>{architect.email}</TableCell>
                                                <TableCell>{architect.phone}</TableCell>
                                                <TableCell>{architect.location}</TableCell>
                                                <TableCell>{architect.registration_number || "N/A"}</TableCell>
                                                <TableCell>
                                                    <span
                                                        className={`px-2 py-1 rounded-full text-xs ${architect.is_active === 1
                                                                ? "bg-green-100 text-green-800"
                                                                : "bg-red-100 text-red-800"
                                                            }`}
                                                    >
                                                        {architect.is_active === 1 ? "Active" : "Inactive"}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => openEditDialog(architect)}
                                                        >
                                                            <Edit className="h-3 w-3" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => openResetPasswordDialog(architect)}
                                                        >
                                                            <Key className="h-3 w-3" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="destructive"
                                                            onClick={() => handleDelete(architect.id, architect.name)}
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Edit Dialog */}
                <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Edit Architect</DialogTitle>
                            <DialogDescription>Update architect information</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleEdit} className="space-y-4">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="edit-name">Firm Name *</Label>
                                    <Input
                                        id="edit-name"
                                        value={editFormData.name}
                                        onChange={(e) =>
                                            setEditFormData({ ...editFormData, name: e.target.value })
                                        }
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-email">Email *</Label>
                                    <Input
                                        id="edit-email"
                                        type="email"
                                        value={editFormData.email}
                                        onChange={(e) =>
                                            setEditFormData({ ...editFormData, email: e.target.value })
                                        }
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-phone">Phone *</Label>
                                    <Input
                                        id="edit-phone"
                                        type="tel"
                                        value={editFormData.phone}
                                        onChange={(e) =>
                                            setEditFormData({ ...editFormData, phone: e.target.value })
                                        }
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-location">Location *</Label>
                                    <Input
                                        id="edit-location"
                                        value={editFormData.location}
                                        onChange={(e) =>
                                            setEditFormData({ ...editFormData, location: e.target.value })
                                        }
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-registration">Registration Number</Label>
                                    <Input
                                        id="edit-registration"
                                        value={editFormData.registration_number}
                                        onChange={(e) =>
                                            setEditFormData({
                                                ...editFormData,
                                                registration_number: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-active">Status</Label>
                                    <select
                                        id="edit-active"
                                        className="w-full px-3 py-2 border rounded-md"
                                        value={editFormData.is_active ? "1" : "0"}
                                        onChange={(e) =>
                                            setEditFormData({
                                                ...editFormData,
                                                is_active: e.target.value === "1",
                                            })
                                        }
                                    >
                                        <option value="1">Active</option>
                                        <option value="0">Inactive</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsEditOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isSaving}>
                                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Save Changes
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Reset Password Dialog */}
                <Dialog open={isResetPasswordOpen} onOpenChange={setIsResetPasswordOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Reset Password</DialogTitle>
                            <DialogDescription>
                                Set a new password for {selectedArchitect?.name}
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleResetPassword} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="new-password">New Password *</Label>
                                <Input
                                    id="new-password"
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                    minLength={6}
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsResetPasswordOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isSaving}>
                                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Reset Password
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
};

export default ArchitectManagement;
