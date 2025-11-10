import { useEffect, useState } from "react";
import {
  Building,
  Search,
  Plus,
  Mail,
  Phone,
  MapPin,
  Filter,
  X,
  Home,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiClient } from "../config/api";

const Agencies = () => {
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingAgency, setEditingAgency] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    invoiceDayOfMonth: "28",
    dueDayOfMonth: "5",
  });

  useEffect(() => {
    fetchAgencies();
  }, []);

  const fetchAgencies = async () => {
    try {
      const response = await apiClient.get("/agencies");
      const agenciesData =
        response.data?.data?.agencies ||
        response.data?.agencies ||
        response.data?.data ||
        response.data ||
        [];
      setAgencies(Array.isArray(agenciesData) ? agenciesData : []);
    } catch (error) {
      console.error("Error fetching agencies:", error);
      setError("Failed to load agencies");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (agency = null) => {
    if (agency) {
      setEditingAgency(agency);
      setFormData({
        name: agency.name || "",
        invoiceDayOfMonth: agency.invoiceDayOfMonth?.toString() || "28",
        dueDayOfMonth: agency.dueDayOfMonth?.toString() || "5",
      });
    } else {
      setEditingAgency(null);
      setFormData({
        name: "",
        invoiceDayOfMonth: "28",
        dueDayOfMonth: "5",
      });
    }
    setError("");
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingAgency(null);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const payload = {
        ...formData,
        invoiceDayOfMonth: parseInt(formData.invoiceDayOfMonth),
        dueDayOfMonth: parseInt(formData.dueDayOfMonth),
      };

      if (editingAgency) {
        await apiClient.put(`/agencies/${editingAgency.id}`, payload);
        setSuccess("Agency updated successfully");
      } else {
        await apiClient.post("/agencies", payload);
        setSuccess("Agency created successfully");
      }
      handleCloseModal();
      fetchAgencies();
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      console.error("Error saving agency:", error);
      setError(error.response?.data?.error || "Failed to save agency");
    }
  };

  const handleDelete = async (agency) => {
    if (!window.confirm(`Are you sure you want to delete "${agency.name}"?`)) {
      return;
    }

    try {
      await apiClient.delete(`/agencies/${agency.id}`);
      setSuccess("Agency deleted successfully");
      fetchAgencies();
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      console.error("Error deleting agency:", error);
      setError(error.response?.data?.error || "Failed to delete agency");
      setTimeout(() => setError(""), 3000);
    }
  };

  const filteredAgencies = agencies.filter((agency) =>
    agency.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-muted-foreground">Loading agencies...</div>
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
            Agencies
          </h1>
          <p className="text-lg text-gray-600">
            Manage property management agencies
          </p>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>{filteredAgencies.length} agencies</span>
          </div>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Agency
        </Button>
      </div>

      <div className="relative max-w-2xl">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search agencies..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-12 h-12"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredAgencies.map((agency) => (
          <Card key={agency.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                    <Building className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{agency.name}</CardTitle>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center text-sm text-gray-600">
                <Home className="h-4 w-4 mr-2" />
                Invoice Day: {agency.invoiceDayOfMonth}
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Home className="h-4 w-4 mr-2" />
                Due Day: {agency.dueDayOfMonth}
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenModal(agency)}
                  className="flex-1"
                >
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(agency)}
                  className="flex-1 text-red-600 hover:text-red-700"
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredAgencies.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Building className="h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No agencies found
          </h3>
          <p className="text-gray-600 mb-8">
            {searchTerm
              ? "Try adjusting your search"
              : "Get started by adding your first agency"}
          </p>
          <Button onClick={() => handleOpenModal()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Agency
          </Button>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">
                {editingAgency ? "Edit Agency" : "Add New Agency"}
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
                  Agency Name *
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
                  Invoice Day of Month *
                </label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={formData.invoiceDayOfMonth}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      invoiceDayOfMonth: e.target.value,
                    })
                  }
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Day of Month *
                </label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={formData.dueDayOfMonth}
                  onChange={(e) =>
                    setFormData({ ...formData, dueDayOfMonth: e.target.value })
                  }
                  required
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
                  {editingAgency ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Agencies;
