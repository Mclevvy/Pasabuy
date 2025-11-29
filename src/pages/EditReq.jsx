import React, { useState, useRef, useEffect } from "react";
import { FiArrowLeft, FiX, FiMapPin, FiCamera, FiCalendar, FiPackage } from "react-icons/fi";
import { FaMoneyBillWave, FaStickyNote, FaStore } from "react-icons/fa";
import { updateDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import "./EditReq.css";

const EditReq = ({ editingRequest, onClose, onUpdate, locations }) => {
  const fileInputRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [editFormData, setEditFormData] = useState({
    title: "",
    quantity: 1,
    price: "",
    storeLocation: "",
    pickupDate: "",
    note: "",
    image: null,
    imagePreview: null,
  });

  // Initialize form with request data
  useEffect(() => {
    if (editingRequest) {
      setEditFormData({
        title: editingRequest.title || "",
        quantity: editingRequest.quantity || 1,
        price: editingRequest.price ? `₱ ${editingRequest.price.toLocaleString()}` : "",
        storeLocation: editingRequest.storeLocation || editingRequest.location || "",
        pickupDate: editingRequest.pickupDate || "",
        note: editingRequest.note || "",
        image: null,
        imagePreview: editingRequest.imageUrl || null,
      });
    }
  }, [editingRequest]);

  // Calculate fees
  const calculateFees = () => {
    try {
      const priceString = editFormData.price.replace(/[^0-9]/g, "");
      const price = parseFloat(priceString) || 0;
      const serviceFee = Math.max(50, price * 0.05);
      const platformFee = Math.max(25, price * 0.02);
      const totalFees = serviceFee + platformFee;
      
      return {
        serviceFee: Math.round(serviceFee),
        platformFee: Math.round(platformFee),
        totalFees: Math.round(totalFees),
        estimatedTotal: Math.round(price + totalFees)
      };
    } catch (error) {
      return { serviceFee: 0, platformFee: 0, totalFees: 0, estimatedTotal: 0 };
    }
  };

  // Form handlers
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "storeLocation") {
      if (value.length > 1) {
        const filtered = locations.filter(location =>
          location.name.toLowerCase().includes(value.toLowerCase())
        );
        setLocationSuggestions(filtered.map(loc => loc.name));
        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
      }
    }
  };

  const handleLocationSelect = (locationName) => {
    setEditFormData((prev) => ({
      ...prev,
      storeLocation: locationName,
    }));
    setShowSuggestions(false);
  };

  const handlePriceChange = (e) => {
    let value = e.target.value.replace(/[^0-9]/g, "");
    if (value) {
      value = "₱ " + parseInt(value).toLocaleString();
    }
    setEditFormData((prev) => ({
      ...prev,
      price: value,
    }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("File size too large! Please select an image under 5MB.");
        return;
      }

      if (!file.type.startsWith('image/')) {
        alert("Please select a valid image file (JPG, PNG, etc.)");
        return;
      }

      const previewUrl = URL.createObjectURL(file);
      setEditFormData((prev) => ({
        ...prev,
        image: file,
        imagePreview: previewUrl,
      }));
    }
  };

  const removeImage = () => {
    if (editFormData.imagePreview) {
      URL.revokeObjectURL(editFormData.imagePreview);
    }
    setEditFormData((prev) => ({
      ...prev,
      image: null,
      imagePreview: null,
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    if (!editFormData.title.trim()) {
      alert("❌ Please enter an item name.");
      setSubmitting(false);
      return;
    }

    if (!editFormData.storeLocation.trim()) {
      alert("❌ Please select a store location.");
      setSubmitting(false);
      return;
    }

    try {
      const priceString = editFormData.price.replace(/[^0-9]/g, "");
      const price = parseFloat(priceString) || 0;
      const fees = calculateFees();
      const totalAmount = price + fees.totalFees;

      // Find location coordinates
      const foundLocation = locations.find(loc => loc.name === editFormData.storeLocation);
      
      const updateData = {
        title: editFormData.title.trim(),
        quantity: parseInt(editFormData.quantity) || 1,
        price: totalAmount,
        storeLocation: editFormData.storeLocation.trim(),
        location: editFormData.storeLocation.trim(),
        pickupDate: editFormData.pickupDate,
        note: editFormData.note.trim(),
        items: [`${editFormData.title.trim()} (Qty: ${editFormData.quantity})`],
        userLocation: foundLocation ? {
          latitude: foundLocation.lat,
          longitude: foundLocation.lng
        } : null,
        updatedAt: new Date()
      };

      console.log("📤 Updating request:", updateData);

      const requestRef = doc(db, "requests", editingRequest.id);
      await updateDoc(requestRef, updateData);

      console.log("✅ SUCCESS! Request updated");

      // Call the update callback
      onUpdate(editingRequest.id, {
        ...updateData,
        imageUrl: editFormData.imagePreview // Keep existing image if not changed
      });

      onClose();
      
      alert(`✅ Request updated successfully!\n\nTotal Amount: ₱${totalAmount.toLocaleString()}`);

    } catch (error) {
      console.error("❌ ERROR updating request:", error);
      alert("Failed to update request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const fees = calculateFees();

  return (
    <div className="modal-backdrop edit-req-backdrop">
      <div className="modal edit-req-modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <button className="back-btn" onClick={onClose} disabled={submitting}>
            <FiArrowLeft />
          </button>
          <div className="header-text">
            <h3>Edit Request</h3>
            <p>Update your item request</p>
          </div>
          <button className="modal-close" onClick={onClose} disabled={submitting}>
            <FiX />
          </button>
        </header>
        
        <div className="modal-body">
          <form onSubmit={handleSubmit} className="edit-request-form">
            <h4>Item Details</h4>

            {/* Image Upload Section */}
            <div className="form-group">
              <label>Item Photo (Optional)</label>
              <div className="upload-box" onClick={() => !submitting && fileInputRef.current?.click()}>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  disabled={submitting}
                  style={{ display: 'none' }}
                />
                <div className="upload-label">
                  <FiCamera className="camera-icon" />
                  <p>Click to upload new photo</p>
                  <span>JPG, PNG (Max 5MB)</span>
                </div>
              </div>
              
              {editFormData.imagePreview && (
                <div className="image-preview-container">
                  <div className="image-preview">
                    <img src={editFormData.imagePreview} alt="Preview" />
                    <button 
                      type="button" 
                      className="remove-image-btn"
                      onClick={removeImage}
                      disabled={submitting}
                    >
                      <FiX />
                    </button>
                  </div>
                  <p className="file-name">{editFormData.image?.name || "Current image"}</p>
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Item Name *</label>
              <input
                type="text"
                name="title"
                placeholder="e.g. iPhone 15 Pro Max"
                value={editFormData.title}
                onChange={handleEditChange}
                required
                disabled={submitting}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Quantity</label>
                <input
                  type="number"
                  name="quantity"
                  min="1"
                  value={editFormData.quantity}
                  onChange={handleEditChange}
                  disabled={submitting}
                />
              </div>
              <div className="form-group">
                <label>Price *</label>
                <input
                  type="text"
                  name="price"
                  placeholder="₱ 50,000"
                  value={editFormData.price}
                  onChange={handlePriceChange}
                  required
                  disabled={submitting}
                />
              </div>
            </div>

            {/* Store Location */}
            <div className="form-group">
              <label>Store Location *</label>
              <div className="input-with-suggestions">
                <div className="input-icon">
                  <FiMapPin className="icon" />
                  <input
                    type="text"
                    name="storeLocation"
                    placeholder="e.g. SM City Calapan"
                    value={editFormData.storeLocation}
                    onChange={handleEditChange}
                    required
                    disabled={submitting}
                  />
                </div>
                {showSuggestions && locationSuggestions.length > 0 && (
                  <div className="suggestions-dropdown">
                    {locationSuggestions.map((location, index) => (
                      <div
                        key={index}
                        className="suggestion-item"
                        onClick={() => !submitting && handleLocationSelect(location)}
                      >
                        <FiMapPin className="suggestion-icon" />
                        {location}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="form-group">
              <label>Preferred Pickup Time *</label>
              <input
                type="datetime-local"
                name="pickupDate"
                value={editFormData.pickupDate}
                onChange={handleEditChange}
                required
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <label>Additional Notes (Optional)</label>
              <textarea
                name="note"
                placeholder="Any specific requirements or preferences..."
                value={editFormData.note}
                onChange={handleEditChange}
                disabled={submitting}
                rows="4"
              ></textarea>
            </div>

            {/* Summary Section */}
            <div className="summary-box">
              <h4>Updated Request Summary</h4>
              <div className="summary-item">
                <span>Item Price</span>
                <span>{editFormData.price || "₱ 0"}</span>
              </div>
              <div className="summary-item">
                <span>Service Fee (5% min ₱50)</span>
                <span>₱{fees.serviceFee}</span>
              </div>
              <div className="summary-item">
                <span>Platform Fee (2% min ₱25)</span>
                <span>₱{fees.platformFee}</span>
              </div>
              <div className="summary-item total">
                <span>Total Fees</span>
                <span>₱{fees.totalFees}</span>
              </div>
              <div className="summary-item grand-total">
                <span>Estimated Total</span>
                <span>₱{fees.estimatedTotal}</span>
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn ghost"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn primary"
                disabled={submitting}
              >
                {submitting ? "Updating..." : `Update Request - ₱${fees.estimatedTotal}`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditReq;