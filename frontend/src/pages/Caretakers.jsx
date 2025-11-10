import { useEffect, useState } from "react";
import {
  UserCheck,
  Search,
  Plus,
  Mail,
  Phone,
  DollarSign,
  Calendar,
  Filter,
  X,
  Percent,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "../config/api";

const Caretakers = () => {
  const [caretakers, setCaretakers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingCaretaker, setEditingCaretaker] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterPaymentType, setFilterPaymentType] = useState("all");

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    idNumber: "",
    paymentType: "SALARY",
    salaryAmount: "",
    commissionRate: "0",
    commissionType: "PERCENTAGE",
  });

  useEffect(() => {
    fetchCaretakers();
  }, []);

  const fetchCaretakers = async () => {
    try {
      const response = await apiClient.get("/caretakers");
      const caretakersData =
        response.data?.data?.caretakers ||
        response.data?.caretakers ||
        response.data?.data ||
        response.data ||
        [];
      setCaretakers(Array.isArray(caretakersData) ? caretakersData : []);
    } catch (error) {
      console.error("Error fetching caretakers:", error);
      setError("Failed to load caretakers");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (caretaker = null) => {
    if (caretaker) {
      setEditingCaretaker(caretaker);
      setFormData({
        name: caretaker.name || "",
        phone: caretaker.phone || "",
        email: caretaker.email || "",
        idNumber: caretaker.idNumber || "",
        paymentType: caretaker.paymentType || "SALARY",
        salaryAmount: caretaker.salaryAmount?.toString() || "",
        commissionRate: caretaker.commissionRate?.toString() || "0",
        commissionType: caretaker.commissionType || "PERCENTAGE",
      });
    } else {
      setEditingCaretaker(null);
      setFormData({
        name: "",
        phone: "",
        email: "",
        idNumber: "",
        paymentType: "SALARY",
        salaryAmount: "",
        commissionRate: "0",
        commissionType: "PERCENTAGE",
      });
    }
    setError("");
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCaretaker(null);
    setFormData({
      name: "",
      phone: "",
      email: "",
      idNumber: "",
      paymentType: "SALARY",
      salaryAmount: "",
      commissionRate: "0",
      commissionType: "PERCENTAGE",
    });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const payload = {
        ...formData,
        salaryAmount: formData.salaryAmount
          ? parseFloat(formData.salaryAmount)
          : null,
        commissionRate: parseFloat(formData.commissionRate),
      };

      if (editingCaretaker) {
        await apiClient.put(`/caretakers/${editingCaretaker.id}`, payload);
        setSuccess("Caretaker updated successfully");
      } else {
        await apiClient.post("/caretakers", payload);
        setSuccess("Caretaker created successfully");
      }
      handleCloseModal();
      fetchCaretakers();
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      console.error("Error saving caretaker:", error);
      setError(error.response?.data?.error || "Failed to save caretaker");
    }
  };

  const handleDelete = async (caretaker) => {
    if (
      !window.confirm(`Are you sure you want to delete "${caretaker.name}"?`)
    ) {
      return;
    }

    try {
      await apiClient.delete(`/caretakers/${caretaker.id}`);
      setSuccess("Caretaker deleted successfully");
      fetchCaretakers();
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      console.error("Error deleting caretaker:", error);
      setError(error.response?.data?.error || "Failed to delete caretaker");
      setTimeout(() => setError(""), 3000);
    }
  };

  const filteredCaretakers = caretakers.filter((caretaker) => {
    const matchesSearch =
      caretaker.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      caretaker.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      caretaker.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPaymentType =
      filterPaymentType === "all" ||
      caretaker.paymentType === filterPaymentType;

    return matchesSearch && matchesPaymentType;
  });

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-muted-foreground">Loading caretakers...</div>
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
            Caretakers
          </h1>
          <p className="text-lg text-gray-600">
            Manage property caretakers and their compensation
          </p>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>{filteredCaretakers.length} caretakers</span>
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
            Add Caretaker
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="relative max-w-2xl">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search caretakers by name, phone, or email..."
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
                  Payment Type
                </label>
                <select
                  value={filterPaymentType}
                  onChange={(e) => setFilterPaymentType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="all">All Types</option>
                  <option value="SALARY">Salary</option>
                  <option value="COMMISSION">Commission</option>
                  <option value="MIXED">Mixed</option>
                </select>
              </div>
            </div>
          </Card>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredCaretakers.map((caretaker) => (
          <Card
            key={caretaker.id}
            className="hover:shadow-lg transition-shadow"
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center">
                    <UserCheck className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{caretaker.name}</CardTitle>
                    <Badge variant="secondary" className="mt-1">
                      {caretaker.paymentType}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {caretaker.phone && (
                <div className="flex items-center text-sm text-gray-600">
                  <Phone className="h-4 w-4 mr-2" />
                  {caretaker.phone}
                </div>
              )}
              {caretaker.email && (
                <div className="flex items-center text-sm text-gray-600">
                  <Mail className="h-4 w-4 mr-2" />
                  {caretaker.email}
                </div>
              )}
              {caretaker.salaryAmount && (
                <div className="flex items-center text-sm text-gray-600">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Salary: KSh {caretaker.salaryAmount.toLocaleString()}
                </div>
              )}
              {caretaker.commissionRate > 0 && (
                <div className="flex items-center text-sm text-gray-600">
                  <Percent className="h-4 w-4 mr-2" />
                  Commission: {caretaker.commissionRate}%
                </div>
              )}
              <div className="flex items-center text-sm text-gray-600">
                <Calendar className="h-4 w-4 mr-2" />
                Joined {new Date(caretaker.createdAt).toLocaleDateString()}
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenModal(caretaker)}
                  className="flex-1"
                >
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(caretaker)}
                  className="flex-1 text-red-600 hover:text-red-700"
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCaretakers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <UserCheck className="h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No caretakers found
          </h3>
          <p className="text-gray-600 mb-8">
            {searchTerm || filterPaymentType !== "all"
              ? "Try adjusting your filters"
              : "Get started by adding your first caretaker"}
          </p>
          <Button onClick={() => handleOpenModal()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Caretaker
          </Button>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">
                {editingCaretaker ? "Edit Caretaker" : "Add New Caretaker"}
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
                  ID Number
                </label>
                <Input
                  value={formData.idNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, idNumber: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Type *
                </label>
                <select
                  value={formData.paymentType}
                  onChange={(e) =>
                    setFormData({ ...formData, paymentType: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="SALARY">Salary</option>
                  <option value="COMMISSION">Commission</option>
                  <option value="MIXED">Mixed</option>
                </select>
              </div>

              {(formData.paymentType === "SALARY" ||
                formData.paymentType === "MIXED") && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Salary Amount (KSh)
                  </label>
                  <Input
                    type="number"
                    value={formData.salaryAmount}
                    onChange={(e) =>
                      setFormData({ ...formData, salaryAmount: e.target.value })
                    }
                  />
                </div>
              )}

              {(formData.paymentType === "COMMISSION" ||
                formData.paymentType === "MIXED") && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Commission Rate (%)
                    </label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.commissionRate}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          commissionRate: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Commission Type
                    </label>
                    <select
                      value={formData.commissionType}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          commissionType: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="PERCENTAGE">Percentage</option>
                      <option value="FLAT_RATE">Flat Rate</option>
                    </select>
                  </div>
                </>
              )}

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
                  {editingCaretaker ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Caretakers;
