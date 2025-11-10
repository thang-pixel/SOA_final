import React from "react";
import { Box, Avatar, Typography } from "@mui/material";

function LeftPanel({ loggedInStudent }) {
    return (
        <Box
            sx={{
                p: 3,
                border: "2px dashed grey",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                bgcolor: "#fafafa",
                borderRadius: 2,
            }}
        >
            <Avatar
                alt="Profile Picture"
                src="https://mui.com/static/images/avatar/1.jpg"
                sx={{ width: 150, height: 150, mb: 2 }}
            />
            <Typography variant="h6" gutterBottom>
                {loggedInStudent?.fullName || "Đang tải..."}
            </Typography>
            <Typography variant="body1">
                MSSV: {loggedInStudent?.studentId || "---"}
            </Typography>
            <Typography variant="body1">
                Email: {loggedInStudent?.email || "---"}
            </Typography>
            <Typography variant="body1">
                SĐT: {loggedInStudent?.phone || "---"}
            </Typography>
            <Typography
                variant="body1"
                sx={{ mt: 1, fontWeight: "bold", color: "green" }}
            >
                Số dư:{" "}
                {loggedInStudent
                    ? `${loggedInStudent.balance.toLocaleString()}₫`
                    : "---"}
            </Typography>
        </Box>
    );
}

export default LeftPanel;
