import { useEffect, useState } from "react";
import {
  Plus,
  Search,
  MapPin,
  Phone,
  Mail,
  Edit,
  Trash2,
  X,
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

const Caretakers = () => {
  const [caretakers, setCaretakers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingCaretaker, setEditingCaretaker] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
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
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:4000/api/caretakers", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = response.data.data || response.data;
      setCaretakers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching caretakers:", error);
      setCaretakers([]);
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
        salaryAmount: caretaker.salaryAmount || "",
        commissionRate: caretaker.commissionRate || "0",
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
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const token = localStorage.getItem("token");
      const payload = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email || undefined,
        idNumber: formData.idNumber || undefined,
        paymentType: formData.paymentType,
        salaryAmount: formData.salaryAmount
          ? parseFloat(formData.salaryAmount)
          : undefined,
        commissionRate: parseFloat(formData.commissionRate),
        commissionType: formData.commissionType,
      };

      if (editingCaretaker) {
        await axios.put(`/caretakers/${editingCaretaker.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSuccess("Caretaker updated successfully");
      } else {
        await axios.post("/caretakers", payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
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
      !window.confirm(
        `Are you sure you want to delete "${caretaker.name}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`/caretakers/${caretaker.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccess("Caretaker deleted successfully");
      fetchCaretakers();
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      console.error("Error deleting caretaker:", error);
      setError(error.response?.data?.error || "Failed to delete caretaker");
      setTimeout(() => setError(""), 3000);
    }
  };

  const filteredCaretakers = caretakers.filter(
    (caretaker) =>
      caretaker.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      caretaker.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      caretaker.phone?.includes(searchTerm)
  );

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "default";
      case "inactive":
        return "secondary";
      case "on_leave":
        return "outline";
      default:
        return "outline";
    }
  };

  const activeCaretakers = caretakers.filter(
    (c) => c.status?.toLowerCase() === "active"
  ).length;

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-muted-foreground">Loading caretakers...</div>
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
          <h1 className="text-3xl font-bold tracking-tight">Caretakers</h1>
          <p className="text-muted-foreground">
            Manage property caretakers and maintenance staff
          </p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Caretaker
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Caretakers
            </CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{caretakers.length}</div>
            <p className="text-xs text-muted-foreground">
              Registered caretakers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Caretakers
            </CardTitle>
            <MapPin className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCaretakers}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Properties Covered
            </CardTitle>
            <MapPin className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {caretakers.reduce((sum, c) => sum + (c.property_count || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">Total assignments</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search caretakers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {filteredCaretakers.map((caretaker) => (
          <Card
            key={caretaker.id}
            className="hover:shadow-md transition-shadow"
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-xl">
                    {caretaker.name || "Unknown Caretaker"}
                  </CardTitle>
                  <CardDescription>
                    {caretaker.property_name || "No property assigned"}
                  </CardDescription>
                </div>
                <Badge variant={getStatusColor(caretaker.status)}>
                  {caretaker.status || "N/A"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center text-sm">
                    <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>{caretaker.email || "N/A"}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Phone className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>{caretaker.phone || "N/A"}</span>
                  </div>
                  {caretaker.address && (
                    <div className="flex items-center text-sm">
                      <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span>{caretaker.address}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-sm text-muted-foreground">Properties</p>
                    <p className="text-lg font-semibold">
                      {caretaker.property_count || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Monthly Salary
                    </p>
                    <p className="text-lg font-semibold">
                      KSh {parseFloat(caretaker.salary || 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Start Date</p>
                    <p className="text-sm font-medium">
                      {caretaker.start_date
                        ? new Date(caretaker.start_date).toLocaleDateString()
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Rating</p>
                    <p className="text-lg font-semibold">
                      {caretaker.rating ? `${caretaker.rating}/5` : "N/A"}
                    </p>
                  </div>
                </div>

                {caretaker.notes && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground">Notes</p>
                    <p className="text-sm mt-1">{caretaker.notes}</p>
                  </div>
                )}

                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleOpenModal(caretaker)}
                  >
                    <Edit className="mr-1 h-3 w-3" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(caretaker)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCaretakers.length === 0 && (
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground">No caretakers found</p>
            <Button className="mt-4" onClick={() => handleOpenModal()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Caretaker
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
                  {editingCaretaker ? "Edit Caretaker" : "Add New Caretaker"}
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Full Name *
                    </label>
                    <Input
                      required
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="e.g., John Doe"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Phone Number *
                    </label>
                    <Input
                      required
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      placeholder="+254 700 000000"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Email
                    </label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder="john@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      ID Number
                    </label>
                    <Input
                      value={formData.idNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, idNumber: e.target.value })
                      }
                      placeholder="12345678"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Payment Type *
                  </label>
                  <select
                    required
                    value={formData.paymentType}
                    onChange={(e) =>
                      setFormData({ ...formData, paymentType: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="SALARY">Salary</option>
                    <option value="COMMISSION">Commission</option>
                    <option value="MIXED">Mixed (Salary + Commission)</option>
                  </select>
                </div>

                {(formData.paymentType === "SALARY" ||
                  formData.paymentType === "MIXED") && (
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Monthly Salary (KSh)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.salaryAmount}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          salaryAmount: e.target.value,
                        })
                      }
                      placeholder="e.g., 15000"
                    />
                  </div>
                )}

                {(formData.paymentType === "COMMISSION" ||
                  formData.paymentType === "MIXED") && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Commission Rate *
                      </label>
                      <Input
                        type="number"
                        required
                        min="0"
                        max="100"
                        step="0.1"
                        value={formData.commissionRate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            commissionRate: e.target.value,
                          })
                        }
                        placeholder="e.g., 10"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Commission Type *
                      </label>
                      <select
                        required
                        value={formData.commissionType}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            commissionType: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border rounded-md"
                      >
                        <option value="PERCENTAGE">Percentage</option>
                        <option value="FLAT_RATE">Flat Rate</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1">
                    {editingCaretaker ? "Update Caretaker" : "Create Caretaker"}
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

export default Caretakers;
