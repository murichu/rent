import { useEffect, useState } from "react";
import {
  FileText,
  Search,
  Plus,
  Calendar,
  DollarSign,
  User,
  Filter,
  X,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "../config/api";

const Leases = () => {
  const [leases, setLeases] = useState([]);
  const [properties, setProperties] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingLease, setEditingLease] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");

  const [formData, setFormData] = useState({
    propertyId: "",
    tenantId: "",
    startDate: "",
    endDate: "",
    rentAmount: "",
    paymentDayOfMonth: "1",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [leasesRes, propertiesRes, tenantsRes] = await Promise.all([
        apiClient.get("/leases"),
        apiClient.get("/properties"),
        apiClient.get("/tenants"),
      ]);

      const leasesData =
        leasesRes.data?.data?.leases ||
        leasesRes.data?.leases ||
        leasesRes.data?.data ||
        leasesRes.data ||
        [];
      const propertiesData =
        propertiesRes.data?.data?.properties ||
        propertiesRes.data?.properties ||
        propertiesRes.data?.data ||
        propertiesRes.data ||
        [];
      const tenantsData =
        tenantsRes.data?.data?.tenants ||
        tenantsRes.data?.tenants ||
        tenantsRes.data?.data ||
        tenantsRes.data ||
        [];

      setLeases(Array.isArray(leasesData) ? leasesData : []);
      setProperties(Array.isArray(propertiesData) ? propertiesData : []);
      setTenants(Array.isArray(tenantsData) ? tenantsData : []);
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (lease = null) => {
    if (lease) {
      setEditingLease(lease);
      setFormData({
        propertyId: lease.propertyId || "",
        tenantId: lease.tenantId || "",
        startDate: lease.startDate
          ? new Date(lease.startDate).toISOString().split("T")[0]
          : "",
        endDate: lease.endDate
          ? new Date(lease.endDate).toISOString().split("T")[0]
          : "",
        rentAmount: lease.rentAmount?.toString() || "",
        paymentDayOfMonth: lease.paymentDayOfMonth?.toString() || "1",
      });
    } else {
      setEditingLease(null);
      setFormData({
        propertyId: "",
        tenantId: "",
        startDate: "",
        endDate: "",
        rentAmount: "",
        paymentDayOfMonth: "1",
      });
    }
    setError("");
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingLease(null);
    setFormData({
      propertyId: "",
      tenantId: "",
      startDate: "",
      endDate: "",
      rentAmount: "",
      paymentDayOfMonth: "1",
    });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const payload = {
        ...formData,
        rentAmount: parseInt(formData.rentAmount),
        paymentDayOfMonth: parseInt(formData.paymentDayOfMonth),
      };

      if (editingLease) {
        await apiClient.put(`/leases/${editingLease.id}`, payload);
        setSuccess("Lease updated successfully");
      } else {
        await apiClient.post("/leases", payload);
        setSuccess("Lease created successfully");
      }
      handleCloseModal();
      fetchData();
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      console.error("Error saving lease:", error);
      setError(error.response?.data?.error || "Failed to save lease");
    }
  };

  const getLeaseStatus = (lease) => {
    const now = new Date();
    const start = new Date(lease.startDate);
    const end = lease.endDate ? new Date(lease.endDate) : null;

    if (now < start) return { label: "Upcoming", variant: "secondary" };
    if (end && now > end) return { label: "Expired", variant: "destructive" };
    if (end) {
      const daysUntilEnd = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
      if (daysUntilEnd <= 30)
        return { label: "Expiring Soon", variant: "warning" };
    }
    return { label: "Active", variant: "default" };
  };

  const filteredLeases = leases.filter((lease) => {
    const property = properties.find((p) => p.id === lease.propertyId);
    const tenant = tenants.find((t) => t.id === lease.tenantId);
    const status = getLeaseStatus(lease);

    const matchesSearch =
      property?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      filterStatus === "all" ||
      status.label.toLowerCase() === filterStatus.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-muted-foreground">Loading leases...</div>
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
            Leases
          </h1>
          <p className="text-lg text-gray-600">
            Manage property lease agreements
          </p>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>{filteredLeases.length} leases</span>
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
            Add Lease
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="relative max-w-2xl">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search leases by property or tenant..."
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
                  Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="expiring soon">Expiring Soon</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
            </div>
          </Card>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredLeases.map((lease) => {
          const property = properties.find((p) => p.id === lease.propertyId);
          const tenant = tenants.find((t) => t.id === lease.tenantId);
          const status = getLeaseStatus(lease);

          return (
            <Card key={lease.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                      <FileText className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        {property?.title || "Unknown Property"}
                      </CardTitle>
                      <Badge variant={status.variant} className="mt-1">
                        {status.label}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center text-sm text-gray-600">
                  <User className="h-4 w-4 mr-2" />
                  {tenant?.name || "Unknown Tenant"}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <DollarSign className="h-4 w-4 mr-2" />
                  KSh {lease.rentAmount?.toLocaleString()}/month
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="h-4 w-4 mr-2" />
                  {new Date(lease.startDate).toLocaleDateString()} -{" "}
                  {lease.endDate
                    ? new Date(lease.endDate).toLocaleDateString()
                    : "Ongoing"}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Payment due: Day {lease.paymentDayOfMonth}
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenModal(lease)}
                    className="flex-1"
                  >
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredLeases.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No leases found
          </h3>
          <p className="text-gray-600 mb-8">
            {searchTerm || filterStatus !== "all"
              ? "Try adjusting your filters"
              : "Get started by creating your first lease"}
          </p>
          <Button onClick={() => handleOpenModal()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Lease
          </Button>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">
                {editingLease ? "Edit Lease" : "Add New Lease"}
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
                  Property *
                </label>
                <select
                  value={formData.propertyId}
                  onChange={(e) =>
                    setFormData({ ...formData, propertyId: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select Property</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tenant *
                </label>
                <select
                  value={formData.tenantId}
                  onChange={(e) =>
                    setFormData({ ...formData, tenantId: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select Tenant</option>
                  {tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date *
                </label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) =>
                    setFormData({ ...formData, endDate: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rent Amount (KSh) *
                </label>
                <Input
                  type="number"
                  value={formData.rentAmount}
                  onChange={(e) =>
                    setFormData({ ...formData, rentAmount: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Day of Month *
                </label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={formData.paymentDayOfMonth}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      paymentDayOfMonth: e.target.value,
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
                  {editingLease ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leases;
