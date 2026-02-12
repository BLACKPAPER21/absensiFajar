"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Mail, MessageSquare, MoreHorizontal, X, Loader2, Upload, Pencil, Trash2, User } from "lucide-react"; // Added User import
import * as faceapi from 'face-api.js';
import { useLanguage } from "@/components/LanguageProvider"; // Import Language Hook

// Types
type Employee = {
  id: string;
  name: string;
  role: string;
  email: string;
  face_descriptor: any;
  created_at: string;
  dept?: string; // Optional for now
  avatar?: string; // Optional
  status?: string; // Optional
};

const departments = ["All Employees", "Engineering", "Human Resources", "Marketing"];

export default function EmployeesPage() {
  const { t } = useLanguage(); // Use Language Hook
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "employee",
    password: "", // Added password
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);

  // Fetch Employees & Roles
  const [availableRoles, setAvailableRoles] = useState<any[]>([]);

  useEffect(() => {
    fetchEmployees();
    fetchRoles();
    loadModels();
  }, []);

  const fetchRoles = async () => {
      try {
          const res = await fetch('/api/roles');
          if (res.ok) setAvailableRoles(await res.json());
      } catch (e) {
          console.error("Failed to fetch roles");
      }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/employees');
      if (res.ok) {
        const data = await res.json();
        setEmployees(data);
      }
    } catch (error) {
      console.error("Failed to fetch employees", error);
    } finally {
      setLoading(false);
    }
  };

  const loadModels = async () => {
    try {
      // Load from a public CDN for convenience in this demo
      const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      console.log("Face API Models Loaded");
      setModelLoaded(true);
    } catch (err) {
      console.error("Failed to load models", err);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const resetForm = () => {
    setFormData({ name: "", email: "", role: "employee", password: "" });
    setSelectedImage(null);
    setImagePreview(null);
    setEditingId(null);
    setIsModalOpen(false);
  };

  const handleEdit = (employee: Employee) => {
    setFormData({
      name: employee.name,
      email: employee.email,
      role: employee.role,
      password: "", // Default empty on edit
    });
    setEditingId(employee.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}? This cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/employees/${id}`, { method: 'DELETE' });
      if (res.ok) {
        alert("Employee deleted successfully");
        fetchEmployees();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete");
      }
    } catch (error) {
      console.error(error);
      alert("Failed to delete employee");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let descriptor = null;

      // Only process image if a new one is selected
      if (selectedImage) {
        if (!modelLoaded) {
            alert("Face API models are still loading. Please wait a moment.");
            setIsSubmitting(false);
            return;
        }
        const img = await faceapi.fetchImage(imagePreview!);
        const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();

        if (!detection) {
          alert("No face detected in the photo. Please use a clear ID-style photo.");
          setIsSubmitting(false);
          return;
        }
        descriptor = Array.from(detection.descriptor);
      } else if (!editingId) {
         // If adding new, image is mandatory
         alert("Please upload a reference photo.");
         setIsSubmitting(false);
         return;
      }

      // API Call
      const url = editingId ? `/api/employees/${editingId}` : '/api/employees';
      const method = editingId ? 'PUT' : 'POST';

      const payload: any = { ...formData };
      if (descriptor) payload.faceDescriptor = descriptor;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Operation failed');
      }

      // Success
      alert(editingId ? "Employee updated successfully" : "Employee added successfully");
      resetForm();
      fetchEmployees();

    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 h-full bg-zinc-950 min-h-screen text-white relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pl-10 lg:pl-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t('employeesTitle')}</h1>
          <p className="text-zinc-400 mt-1">{t('employeesDesc')}</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="bg-[#13ec6d] text-black hover:bg-[#13ec6d]/90 font-semibold"
          >
             <Plus className="h-4 w-4 mr-2" />
             {t('addEmployee')}
          </Button>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#13ec6d]" />
        </div>
      ) : employees.length === 0 ? (
        <div className="text-center py-20 bg-zinc-900/50 rounded-xl border border-dashed border-zinc-800">
            <User className="h-12 w-12 text-zinc-700 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-zinc-400">{t('noEmployees')}</h3>
            <p className="text-sm text-zinc-500 mt-1">Get started by adding a new team member.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {employees.map((employee) => (
            <div key={employee.id} className="group relative bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-all hover:bg-zinc-900">

              {/* Action Buttons */}
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={() => handleEdit(employee)}
                    className="p-1.5 rounded-md bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition"
                    title="Edit"
                >
                    <Pencil className="h-4 w-4" />
                </button>
                <button
                    onClick={() => handleDelete(employee.id, employee.name)}
                    className="p-1.5 rounded-md bg-zinc-800 text-red-500 hover:bg-zinc-700 transition"
                    title="Delete"
                >
                    <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="flex flex-col items-center text-center mt-2">
                <div className="relative mb-4">
                   <div className="h-20 w-20 rounded-full overflow-hidden border-2 border-zinc-800 bg-zinc-800 flex items-center justify-center">
                     <span className="text-2xl font-bold text-zinc-500 uppercase">{employee.name.substring(0,2)}</span>
                   </div>
                   {employee.face_descriptor && (
                     <div className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-zinc-900 bg-[#13ec6d]" title="Biometrics Registered" />
                   )}
                </div>

                <h3 className="text-lg font-bold text-white mb-1">{employee.name}</h3>
                <p className="text-sm text-zinc-400 mb-4">{employee.role}</p>
                <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-zinc-500">{employee.email}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">{editingId ? "Edit Employee" : "Add New Employee"}</h2>
              <button onClick={resetForm} className="text-zinc-500 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Full Name</label>
                <Input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="bg-zinc-800 border-zinc-700 focus-visible:ring-[#13ec6d]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Email</label>
                <Input
                  required
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="bg-zinc-800 border-zinc-700 focus-visible:ring-[#13ec6d]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Role</label>
                <select
                  className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#13ec6d] capitalize"
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                >
                  {availableRoles.map((role) => (
                      <option key={role.id} value={role.name}>{role.name}</option>
                  ))}
                  {availableRoles.length === 0 && <option value="employee">Employee</option>}
                </select>
              </div>

              {/* Password Field - Only for Admins */}
              {formData.role === 'admin' && (
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">
                        Admin Password {editingId && <span className="text-zinc-500 text-xs font-normal">(Leave blank to keep current)</span>}
                    </label>
                    <Input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      placeholder={editingId ? "••••••••" : "Set admin password"}
                      className="bg-zinc-800 border-zinc-700 focus-visible:ring-[#13ec6d]"
                      required={!editingId}
                    />
                  </div>
              )}

              <div className="pt-2">
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                    {editingId ? "Update Reference Photo (Optional)" : "Reference Photo (for Face ID)"}
                </label>
                <div className="flex items-center gap-4">
                  {imagePreview ? (
                     <div className="h-20 w-20 rounded-lg overflow-hidden border border-zinc-700 relative">
                        <img src={imagePreview} className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => { setSelectedImage(null); setImagePreview(null); }}
                          className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                        >
                          <X className="h-6 w-6 text-white" />
                        </button>
                     </div>
                  ) : (
                    <div className="h-20 w-20 rounded-lg border-2 border-dashed border-zinc-700 flex items-center justify-center bg-zinc-800/50">
                       <Upload className="h-6 w-6 text-zinc-500" />
                    </div>
                  )}

                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="flex-1 bg-transparent border-0 file:bg-zinc-800 file:text-white file:border-0 file:mr-4 file:py-2 file:px-4 file:rounded-full hover:file:bg-zinc-700"
                  />
                </div>
                {!modelLoaded && <p className="text-xs text-amber-500 mt-2">Loading Face Recognition models...</p>}
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={resetForm}>Cancel</Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !modelLoaded || (!selectedImage && !editingId)}
                  className="bg-[#13ec6d] text-black hover:bg-[#13ec6d]/90 font-bold"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    editingId ? "Update Employee" : "Create Employee"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
