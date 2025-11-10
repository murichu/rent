import { useEffect, useState } from "react";
import {
  Building2,
  Search,
  Plus,
  DoorOpen,
  Users,
  Calendar,
  DollarSign,
  Filter,
  X,
  Home,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "../config/api";

const Units = () => {
  const [units, setUnits] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterProperty, setFilterProperty] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const [formData, setFormData] = useState({
    propertyId: "",
    unitNumber: "",
    type: "ONE_BEDROOM",
    bedrooms: "",
    bathrooms: "",
    sizeSqFt: "",
    rentAmount: "",
    status: "VACANT",
  });

  useEffect(() => {
    fetchUnits();
    fetchProperties();
  }, []);

  const fetchUnits = async () => {
    try {
      const response = await apiClient.get("/units");
      const unitsData =
        response.data?.data?.units ||
        response.data?.units ||
        response.data?.data ||
        response.data ||
        [];
      setUnits(Array.isArray(unitsData) ? unitsData : []);
    } catch (error) {
      console.error("Error fetching units:", error);
      setError("Failed to load units");
    } finally {
      setLoading(false);
    }
  };

  const fetchProperties = async () => {
    try {
      const response = await apiClient.get("/properties");
      const propertiesData =
        response.data?.data?.properties ||
        response.data?.properties ||
        response.data?.data ||
        response.data ||
        [];
      setProperties(Array.isArray(propertiesData) ? propertiesData : []);
    } catch (error) {
      console.error("Error fetching properties:", error);
    }
  };

  const handleOpenModal = (unit = null) => {
    if (unit) {
      setEditingUnit(unit);
      setFormData({
        propertyId: unit.propertyId || "",
        unitNumber: unit.unitNumber || "",
        type: unit.type || "ONE_BEDROOM",
        bedrooms: unit.bedrooms?.toString() || "",
        bathrooms: unit.bathrooms?.toString() || "",
        sizeSqFt: unit.sizeSqFt?.toString() || "",
        rentAmount: unit.rentAmount?.toString() || "",
        status: unit.status || "VACANT",
      });
    } else {
      setEditingUnit(null);
      setFormData({
        propertyId: "",
        unitNumber: "",
        type: "ONE_BEDROOM",
        bedrooms: "",
        bathrooms: "",
        sizeSqFt: "",
        rentAmount: "",
        status: "VACANT",
      });
    }
    setError("");
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUnit(null);
    setFormData({
      propertyId: "",
      unitNumber: "",
      type: "ONE_BEDROOM",
      bedrooms: "",
      bathrooms: "",
      sizeSqFt: "",
      rentAmount: "",
      status: "VACANT",
    });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const payload = {
        ...formData,
        bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
        bathrooms: formData.bathrooms ? parseFloat(formData.bathrooms) : null,
        sizeSqFt: formData.sizeSqFt ? parseInt(formData.sizeSqFt) : null,
        rentAmount: parseInt(formData.rentAmount),
      };

      if (editingUnit) {
        await apiClient.put(`/units/${editingUnit.id}`, payload);
        setSuccess("Unit updated successfully");
      } else {
        await apiClient.post("/units", payload);
        setSuccess("Unit created successfully");
      }
      handleCloseModal();
      fetchUnits();
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      console.error("Error saving unit:", error);
      setError(error.response?.data?.error || "Failed to save unit");
    }
  };

  const handleDelete = async (unit) => {
    if (
      !window.confirm(
        `Are you sure you want to delete unit "${unit.unitNumber}"?`
      )
    ) {
      return;
    }

    try {
      await apiClient.delete(`/units/${unit.id}`);
      setSuccess("Unit deleted successfully");
      fetchUnits();
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      console.error("Error deleting unit:", error);
      setError(error.response?.data?.error || "Failed to delete unit");
      setTimeout(() => setError(""), 3000);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      VACANT: "secondary",
      OCCUPIED: "default",
      MAINTENANCE: "destructive",
    };
    return variants[status] || "secondary";
  };

  const filteredUnits = units.filter((unit) => {
    const property = properties.find((p) => p.id === unit.propertyId);
    const matchesSearch =
      unit.unitNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property?.title?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesProperty =
      filterProperty === "all" || unit.propertyId === filterProperty;
    const matchesStatus =
      filterStatus === "all" || unit.status === filterStatus;

    return matchesSearch && matchesProperty && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-muted-foreground">Loading units...</div>
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
            Units
          </h1>
          <p className="text-lg text-gray-600">
            Manage individual property units
          </p>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>{filteredUnits.length} units</span>
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
            Add Unit
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="relative max-w-2xl">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search units by number or property..."
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
                  Property
                </label>
                <select
                  value={filterProperty}
                  onChange={(e) => setFilterProperty(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="all">All Properties</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.title}
                    </option>
                  ))}
                </select>
              </div>

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
                  <option value="VACANT">Vacant</option>
                  <option value="OCCUPIED">Occupied</option>
                  <option value="MAINTENANCE">Maintenance</option>
                </select>
              </div>
            </div>
          </Card>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredUnits.map((unit) => {
          const property = properties.find((p) => p.id === unit.propertyId);
          return (
            <Card key={unit.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-12 w-12 rounded-full bg-cyan-100 flex items-center justify-center">
                      <DoorOpen className="h-6 w-6 text-cyan-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        Unit {unit.unitNumber}
                      </CardTitle>
                      <Badge
                        variant={getStatusBadge(unit.status)}
                        className="mt-1"
                      >
                        {unit.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {property && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Home className="h-4 w-4 mr-2" />
                    {property.title}
                  </div>
                )}
                <div className="flex items-center text-sm text-gray-600">
                  <Building2 className="h-4 w-4 mr-2" />
                  {unit.type?.replace(/_/g, " ")}
                </div>
                {unit.bedrooms && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="h-4 w-4 mr-2" />
                    {unit.bedrooms} bed, {unit.bathrooms} bath
                  </div>
                )}
                <div className="flex items-center text-sm text-gray-600">
                  <DollarSign className="h-4 w-4 mr-2" />
                  KSh {unit.rentAmount?.toLocaleString()}/month
                </div>
                {unit.sizeSqFt && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    {unit.sizeSqFt} sq ft
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenModal(unit)}
                    className="flex-1"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(unit)}
                    className="flex-1 text-red-600 hover:text-red-700"
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredUnits.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <DoorOpen className="h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No units found
          </h3>
          <p className="text-gray-600 mb-8">
            {searchTerm || filterProperty !== "all" || filterStatus !== "all"
              ? "Try adjusting your filters"
              : "Get started by adding your first unit"}
          </p>
          <Button onClick={() => handleOpenModal()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Unit
          </Button>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">
                {editingUnit ? "Edit Unit" : "Add New Unit"}
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
                  Unit Number *
                </label>
                <Input
                  value={formData.unitNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, unitNumber: e.target.value })
                  }
                  required
                  placeholder="e.g., A-101"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="SINGLE_ROOM">Single Room</option>
                  <option value="DOUBLE_ROOM">Double Room</option>
                  <option value="BEDSITTER">Bedsitter</option>
                  <option value="ONE_BEDROOM">One Bedroom</option>
                  <option value="TWO_BEDROOM">Two Bedroom</option>
                  <option value="THREE_BEDROOM">Three Bedroom</option>
                  <option value="FOUR_BEDROOM">Four Bedroom</option>
                  <option value="MAISONETTE">Maisonette</option>
                  <option value="BUNGALOW">Bungalow</option>
                  <option value="PENTHOUSE">Penthouse</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bedrooms
                  </label>
                  <Input
                    type="number"
                    value={formData.bedrooms}
                    onChange={(e) =>
                      setFormData({ ...formData, bedrooms: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bathrooms
                  </label>
                  <Input
                    type="number"
                    step="0.5"
                    value={formData.bathrooms}
                    onChange={(e) =>
                      setFormData({ ...formData, bathrooms: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Size (sq ft)
                </label>
                <Input
                  type="number"
                  value={formData.sizeSqFt}
                  onChange={(e) =>
                    setFormData({ ...formData, sizeSqFt: e.target.value })
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
                  Status *
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="VACANT">Vacant</option>
                  <option value="OCCUPIED">Occupied</option>
                  <option value="MAINTENANCE">Maintenance</option>
                </select>
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
                  {editingUnit ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Units;
