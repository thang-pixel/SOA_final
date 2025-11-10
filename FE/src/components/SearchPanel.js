import React, { useState } from "react";
import { Box, Button, TextField, Typography,Alert } from "@mui/material";

function SearchPanel({ onSearch,error }) {
  const [mssv, setMssv] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(mssv);
  };

  return (
    <Box
      sx={{
        p: 3,
        border: "2px dashed grey",
        borderRadius: 2,
        mb: 3,
        bgcolor: "#fafafa",
      }}
    >
      <Typography variant="h6" gutterBottom>
        Tra cứu thông tin sinh viên
      </Typography>

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          display: "flex",
          gap: 2,
          alignItems: "center",
          mt: 2,
          flexWrap: "wrap",
        }}
      >
        <TextField
          label="Nhập MSSV"
          variant="outlined"
          size="small"
          value={mssv}
          onChange={(e) => setMssv(e.target.value)}
          sx={{ flexGrow: 1, minWidth: 200 }}
        />
        <Button variant="contained" color="primary" type="submit">
          Tìm kiếm
        </Button>
      </Box>
      {/* Hiển thị thông báo lỗi */}
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
}

export default SearchPanel;
