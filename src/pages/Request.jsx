import React, { useState } from "react";
import { FiArrowLeft, FiMapPin, FiCamera } from "react-icons/fi";
import "./Request.css";
import { useNavigate } from "react-router-dom";

const Request = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    itemName: "",
    quantity: 1,
    priceRange: "",
    storeLocation: "",
    pickupDate: "",
    notes: "",
    image: null,
  });

  const [fees] = useState({
    serviceFee: 50,
    platformFee: 25,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageUpload = (e) => {
    setFormData((prev) => ({
      ...prev,
      image: e.target.files[0],
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    alert("✅ Request posted successfully!");
    navigate("/"); // balik sa home after submit
  };

  return (
    <div className="request-container">
      {/* Header */}
      <header className="request-header">
        <button className="back-btn" onClick={() => navigate("/")}>
          <FiArrowLeft className="back-icon" />
        </button>
        <div className="header-text">
          <h2>Request an item</h2>
          <p>Tell us what you need</p>
        </div>
      </header>

      {/* Request Form */}
      <div className="form-wrapper">
        <form className="request-form" onSubmit={handleSubmit}>
          <h3>Item Details</h3>

          <label>Item Name</label>
          <input
            type="text"
            name="itemName"
            placeholder="e.g. iPhone 15 Pro Max"
            value={formData.itemName}
            onChange={handleChange}
            required
          />

          <div className="form-row">
            <div className="form-group">
              <label>Quantity</label>
              <input
                type="number"
                name="quantity"
                min="1"
                value={formData.quantity}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Price Range</label>
              <input
                type="text"
                name="priceRange"
                placeholder="₱ 50,000"
                value={formData.priceRange}
                onChange={handleChange}
              />
            </div>
          </div>

          <label>Store Location</label>
          <div className="input-icon">
            <FiMapPin className="icon" />
            <input
              type="text"
              name="storeLocation"
              placeholder="e.g. SM Mall of Asia"
              value={formData.storeLocation}
              onChange={handleChange}
            />
          </div>
          <p className="location-text">📍 Use my current location</p>

          <label>Preferred Pickup Time</label>
          <input
            type="datetime-local"
            name="pickupDate"
            value={formData.pickupDate}
            onChange={handleChange}
          />

          <label>Additional Notes (Optional)</label>
          <textarea
            name="notes"
            placeholder="Any specific requirements or preferences..."
            value={formData.notes}
            onChange={handleChange}
          ></textarea>

          <label>Add Photos (Optional)</label>
          <div className="upload-box">
            <input
              type="file"
              id="fileUpload"
              accept="image/*"
              onChange={handleImageUpload}
            />
            <label htmlFor="fileUpload" className="upload-label">
              <FiCamera className="camera-icon" />
              <p>
                Upload product images
                <br />
                <span>JPG, PNG up to 5MB</span>
              </p>
            </label>
            {formData.image && (
              <p className="file-name">📷 {formData.image.name}</p>
            )}
          </div>

          {/* Summary Section */}
          <div className="summary-box">
            <h4>Request Summary</h4>
            <div className="summary-item">
              <span>Service Fee</span>
              <span>₱{fees.serviceFee}</span>
            </div>
            <div className="summary-item">
              <span>Platform Fee</span>
              <span>₱{fees.platformFee}</span>
            </div>
            <div className="summary-item total">
              <span>Total Fees</span>
              <span>₱{fees.serviceFee + fees.platformFee}</span>
            </div>
          </div>

          <button type="submit" className="submit-btn">
            Post Request
          </button>
        </form>
      </div>
    </div>
  );
};

export default Request;
