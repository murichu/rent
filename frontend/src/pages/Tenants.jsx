import { useEffect, useState } from "react";
import {
  Users,
  Search,
  Plus,
  Mail,
  Phone,
  Calendar,
  AlertCircle,
  Star,
  Filter,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "../config/api";

const Tenants = () => {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [filterRisk, setFilterRisk] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      const response = await apiClient.get("/tenants");
      const tenantsData =
        response.data?.data?.tenants ||
        response.data?.tenants ||
        response.data?.data ||
        response.data ||
        [];
      setTenants(Array.isArray(tenantsData) ? tenantsData : []);
    } catch (error) {
      console.error("Error fetching tenants:", error);
      setError("Failed to load tenants");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (tenant = null) => {
    if (tenant) {
      setEditingTenant(tenant);
      setFormData({
        name: tenant.name || "",
        email: tenant.email || "",
        phone: tenant.phone || "",
      });
    } else {
      setEditingTenant(null);
      setFormData({ name: "", email: "", phone: "" });
    }
    setError("");
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTenant(null);
    setFormData({ name: "", email: "", phone: "" });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      if (editingTenant) {
        await apiClient.put(`/tenants/${editingTenant.id}`, formData);
        setSuccess("Tenant updated successfully");
      } else {
        await apiClient.post("/tenants", formData);
        setSuccess("Tenant created successfully");
      }
      handleCloseModal();
      fetchTenants();
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      console.error("Error saving tenant:", error);
      setError(error.response?.data?.error || "Failed to save tenant");
    }
  };

  const handleDelete = async (tenant) => {
    if (!window.confirm(`Are you sure you want to delete "${tenant.name}"?`)) {
      return;
    }

    try {
      await apiClient.delete(`/tenants/${tenant.id}`);
      setSuccess("Tenant deleted successfully");
      fetchTenants();
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      console.error("Error deleting tenant:", error);
      setError(error.response?.data?.error || "Failed to delete tenant");
      setTimeout(() => setError(""), 3000);
    }
  };

  const filteredTenants = tenants.filter((tenant) => {
    const matchesSearch =
      tenant.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.phone?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRisk =
      filterRisk === "all" ||
      (filterRisk === "high" && tenant.isHighRisk) ||
      (filterRisk === "low" && !tenant.isHighRisk);

    return matchesSearch && matchesRisk;
  });

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-muted-foreground">Loading tenants...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">
            Tenants
          </h1>
          <p className="text-lg text-gray-600">
            Manage your tenant relationships
          </p>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>{filteredTenants.length} tenants</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button onClick={() => handleOpenModal()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Tenant
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="relative max-w-2xl">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search tenants by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 h-12"
          />
        </div>

        {showFilters && (
          <Card className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Risk Level
                </label>
                <select
                  value={filterRisk}
                  onChange={(e) => setFilterRisk(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="all">All Tenants</option>
                  <option value="low">Low Risk</option>
                  <option value="high">High Risk</option>
                </select>
              </div>
            </div>
          </Card>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredTenants.map((tenant) => (
          <Card key={tenant.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{tenant.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      {tenant.averageRating > 0 && (
                        <div className="flex items-center">
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          <span className="text-sm text-gray-600 ml-1">
                            {tenant.averageRating.toFixed(1)}
                          </span>
                        </div>
                      )}
                      {tenant.isHighRisk && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          High Risk
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {tenant.email && (
                <div className="flex items-center text-sm text-gray-600">
                  <Mail className="h-4 w-4 mr-2" />
                  {tenant.email}
                </div>
              )}
              {tenant.phone && (
                <div className="flex items-center text-sm text-gray-600">
                  <Phone className="h-4 w-4 mr-2" />
                  {tenant.phone}
                </div>
              )}
              <div className="flex items-center text-sm text-gray-600">
                <Calendar className="h-4 w-4 mr-2" />
                Joined {new Date(tenant.createdAt).toLocaleDateString()}
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenModal(tenant)}
                  className="flex-1"
                >
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(tenant)}
                  className="flex-1 text-red-600 hover:text-red-700"
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTenants.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No tenants found
          </h3>
          <p className="text-gray-600 mb-8">
            {searchTerm || filterRisk !== "all"
              ? "Try adjusting your filters"
              : "Get started by adding your first tenant"}
          </p>
          <Button onClick={() => handleOpenModal()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Tenant
          </Button>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">
                {editingTenant ? "Edit Tenant" : "Add New Tenant"}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <Input
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseModal}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  {editingTenant ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tenants;
