import { useEffect, useState } from "react";
import {
  Plus,
  Search,
  Wrench,
  AlertCircle,
  CheckCircle,
  Clock,
  X,
  Filter,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import axios from "axios";

const Maintenance = () => {
  const [requests, setRequests] = useState([]);
  const [properties, setProperties] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [formData, setFormData] = useState({
    propertyId: "",
    tenantId: "",
    title: "",
    description: "",
    priority: "MEDIUM",
    category: "GENERAL",
    status: "PENDING",
  });

  useEffect(() => {
    fetchRequests();
    fetchProperties();
    fetchTenants();
  }, []);

  const fetchRequests = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("/maintenance", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = response.data.data || response.data;
      setRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching maintenance requests:", error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProperties = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("/properties", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data =
        response.data.data?.properties || response.data.data || response.data;
      setProperties(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching properties:", error);
    }
  };

  const fetchTenants = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("/tenants", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = response.data.data || response.data;
      setTenants(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching tenants:", error);
    }
  };

  const handleOpenModal = (request = null) => {
    if (request) {
      setEditingRequest(request);
      setFormData({
        propertyId: request.propertyId || "",
        tenantId: request.tenantId || "",
        title: request.title || "",
        description: request.description || "",
        priority: request.priority || "MEDIUM",
        category: request.category || "GENERAL",
        status: request.status || "PENDING",
      });
    } else {
      setEditingRequest(null);
      setFormData({
        propertyId: "",
        tenantId: "",
        title: "",
        description: "",
        priority: "MEDIUM",
        category: "GENERAL",
        status: "PENDING",
      });
    }
    setError("");
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingRequest(null);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const token = localStorage.getItem("token");

      if (editingRequest) {
        await axios.put(`/maintenance/${editingRequest.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSuccess("Maintenance request updated successfully");
      } else {
        await axios.post("/maintenance", formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSuccess("Maintenance request created successfully");
      }

      handleCloseModal();
      fetchRequests();
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      console.error("Error saving maintenance request:", error);
      setError(
        error.response?.data?.error || "Failed to save maintenance request"
      );
    }
  };

  const filteredRequests = requests.filter((request) => {
    const matchesSearch =
      request.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.property_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      filterStatus === "all" || request.status === filterStatus;
    const matchesPriority =
      filterPriority === "all" || request.priority === filterPriority;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case "COMPLETED":
        return "default";
      case "IN_PROGRESS":
        return "secondary";
      case "PENDING":
        return "outline";
      case "CANCELLED":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toUpperCase()) {
      case "HIGH":
      case "URGENT":
        return "bg-red-100 text-red-800";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800";
      case "LOW":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority?.toUpperCase()) {
      case "HIGH":
      case "URGENT":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case "MEDIUM":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "LOW":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      default:
        return <Wrench className="h-4 w-4 text-gray-600" />;
    }
  };

  const pendingRequests = requests.filter((r) => r.status === "PENDING").length;
  const inProgressRequests = requests.filter(
    (r) => r.status === "IN_PROGRESS"
  ).length;
  const completedRequests = requests.filter(
    (r) => r.status === "COMPLETED"
  ).length;

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-muted-foreground">
          Loading maintenance requests...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Maintenance Requests
          </h1>
          <p className="text-muted-foreground">
            Track and manage property maintenance
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
          <Button onClick={() => handleOpenModal()}>
            <Plus className="mr-2 h-4 w-4" />
            New Request
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Requests
            </CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requests.length}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingRequests}</div>
            <p className="text-xs text-muted-foreground">Awaiting action</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Wrench className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgressRequests}</div>
            <p className="text-xs text-muted-foreground">Being worked on</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedRequests}</div>
            <p className="text-xs text-muted-foreground">Resolved</p>
          </CardContent>
        </Card>
      </div>

      {showFilters && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-3">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border rounded-md"
              >
                <option value="all">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>

              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="px-3 py-2 border rounded-md"
              >
                <option value="all">All Priorities</option>
                <option value="URGENT">Urgent</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>

              <Button
                variant="outline"
                onClick={() => {
                  setFilterStatus("all");
                  setFilterPriority("all");
                  setSearchTerm("");
                }}
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search maintenance requests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid gap-4">
        {filteredRequests.map((request) => (
          <Card key={request.id} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getPriorityIcon(request.priority)}
                    <Badge className={getPriorityColor(request.priority)}>
                      {request.priority}
                    </Badge>
                    <Badge variant={getStatusColor(request.status)}>
                      {request.status}
                    </Badge>
                    {request.category && (
                      <Badge variant="outline">{request.category}</Badge>
                    )}
                  </div>
                  <h3 className="font-semibold text-lg mb-1">
                    {request.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    {request.description}
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="text-gray-500">Property:</span>
                      <p className="font-medium">
                        {request.property_name || "N/A"}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Tenant:</span>
                      <p className="font-medium">
                        {request.tenant_name || "N/A"}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Created:</span>
                      <p className="font-medium">
                        {request.createdAt
                          ? new Date(request.createdAt).toLocaleDateString()
                          : "N/A"}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Updated:</span>
                      <p className="font-medium">
                        {request.updatedAt
                          ? new Date(request.updatedAt).toLocaleDateString()
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenModal(request)}
                  >
                    Edit
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredRequests.length === 0 && (
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <Wrench className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-muted-foreground">
              No maintenance requests found
            </p>
            <Button className="mt-4" onClick={() => handleOpenModal()}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Request
            </Button>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {editingRequest
                    ? "Edit Maintenance Request"
                    : "New Maintenance Request"}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={handleCloseModal}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Title *
                  </label>
                  <Input
                    required
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="e.g., Leaking faucet in kitchen"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Description *
                  </label>
                  <textarea
                    required
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-md"
                    rows="4"
                    placeholder="Detailed description of the issue..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Property *
                    </label>
                    <select
                      required
                      value={formData.propertyId}
                      onChange={(e) =>
                        setFormData({ ...formData, propertyId: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="">Select Property</option>
                      {properties.map((property) => (
                        <option key={property.id} value={property.id}>
                          {property.title || property.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Tenant
                    </label>
                    <select
                      value={formData.tenantId}
                      onChange={(e) =>
                        setFormData({ ...formData, tenantId: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="">Select Tenant (Optional)</option>
                      {tenants.map((tenant) => (
                        <option key={tenant.id} value={tenant.id}>
                          {tenant.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Priority *
                    </label>
                    <select
                      required
                      value={formData.priority}
                      onChange={(e) =>
                        setFormData({ ...formData, priority: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Category *
                    </label>
                    <select
                      required
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="GENERAL">General</option>
                      <option value="PLUMBING">Plumbing</option>
                      <option value="ELECTRICAL">Electrical</option>
                      <option value="HVAC">HVAC</option>
                      <option value="APPLIANCE">Appliance</option>
                      <option value="STRUCTURAL">Structural</option>
                      <option value="PEST_CONTROL">Pest Control</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Status *
                    </label>
                    <select
                      required
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="PENDING">Pending</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1">
                    {editingRequest ? "Update Request" : "Create Request"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseModal}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Maintenance;
