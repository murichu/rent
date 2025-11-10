import { useEffect, useState } from "react";
import {
  Users,
  Search,
  Plus,
  Mail,
  Phone,
  Percent,
  Calendar,
  Filter,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "../config/api";

const Agents = () => {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    commissionRate: "10",
  });

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const response = await apiClient.get("/agents");
      const agentsData =
        response.data?.data?.agents ||
        response.data?.agents ||
        response.data?.data ||
        response.data ||
        [];
      setAgents(Array.isArray(agentsData) ? agentsData : []);
    } catch (error) {
      console.error("Error fetching agents:", error);
      setError("Failed to load agents");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (agent = null) => {
    if (agent) {
      setEditingAgent(agent);
      setFormData({
        name: agent.name || "",
        phone: agent.phone || "",
        email: agent.email || "",
        commissionRate: agent.commissionRate?.toString() || "10",
      });
    } else {
      setEditingAgent(null);
      setFormData({
        name: "",
        phone: "",
        email: "",
        commissionRate: "10",
      });
    }
    setError("");
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingAgent(null);
    setFormData({
      name: "",
      phone: "",
      email: "",
      commissionRate: "10",
    });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const payload = {
        ...formData,
        commissionRate: parseFloat(formData.commissionRate),
      };

      if (editingAgent) {
        await apiClient.put(`/agents/${editingAgent.id}`, payload);
        setSuccess("Agent updated successfully");
      } else {
        await apiClient.post("/agents", payload);
        setSuccess("Agent created successfully");
      }
      handleCloseModal();
      fetchAgents();
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      console.error("Error saving agent:", error);
      setError(error.response?.data?.error || "Failed to save agent");
    }
  };

  const handleDelete = async (agent) => {
    if (!window.confirm(`Are you sure you want to delete "${agent.name}"?`)) {
      return;
    }

    try {
      await apiClient.delete(`/agents/${agent.id}`);
      setSuccess("Agent deleted successfully");
      fetchAgents();
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      console.error("Error deleting agent:", error);
      setError(error.response?.data?.error || "Failed to delete agent");
      setTimeout(() => setError(""), 3000);
    }
  };

  const filteredAgents = agents.filter((agent) => {
    const matchesSearch =
      agent.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.email?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-muted-foreground">Loading agents...</div>
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
            Agents
          </h1>
          <p className="text-lg text-gray-600">
            Manage property agents and their commissions
          </p>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>{filteredAgents.length} agents</span>
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
            Add Agent
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="relative max-w-2xl">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search agents by name, phone, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 h-12"
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredAgents.map((agent) => (
          <Card key={agent.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                    <Users className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{agent.name}</CardTitle>
                    <Badge variant="secondary" className="mt-1">
                      {agent.commissionRate}% Commission
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {agent.phone && (
                <div className="flex items-center text-sm text-gray-600">
                  <Phone className="h-4 w-4 mr-2" />
                  {agent.phone}
                </div>
              )}
              {agent.email && (
                <div className="flex items-center text-sm text-gray-600">
                  <Mail className="h-4 w-4 mr-2" />
                  {agent.email}
                </div>
              )}
              <div className="flex items-center text-sm text-gray-600">
                <Percent className="h-4 w-4 mr-2" />
                Commission: {agent.commissionRate}%
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Calendar className="h-4 w-4 mr-2" />
                Joined {new Date(agent.createdAt).toLocaleDateString()}
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenModal(agent)}
                  className="flex-1"
                >
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(agent)}
                  className="flex-1 text-red-600 hover:text-red-700"
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredAgents.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No agents found
          </h3>
          <p className="text-gray-600 mb-8">
            {searchTerm
              ? "Try adjusting your search"
              : "Get started by adding your first agent"}
          </p>
          <Button onClick={() => handleOpenModal()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Agent
          </Button>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">
                {editingAgent ? "Edit Agent" : "Add New Agent"}
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
                  Phone *
                </label>
                <Input
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
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
                  Commission Rate (%) *
                </label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={formData.commissionRate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      commissionRate: e.target.value,
                    })
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
                  {editingAgent ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Agents;
