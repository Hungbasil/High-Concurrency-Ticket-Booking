import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
  throw new Error(" lỗi api key vui lòng thiết lập lại");
}

const genAI = new GoogleGenerativeAI(apiKey);

const createEventTool = {
  name: "create_event",
  description: "Tạo một sự kiện âm nhạc hoặc biểu diễn mới vào hệ thống",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      title: {
        type: SchemaType.STRING,
        description: "Tên của sự kiện (ví dụ: Concert Sơn Tùng M-TP)",
      },
      start_time: {
        type: SchemaType.STRING,
        description: "Thời gian bắt đầu định dạng ISO (ví dụ: 2026-12-31T20:00:00Z)",
      },
    },
    required: ["title", "start_time"],
  },
};
const getStatsTool = {
  name: "get_event_stats",
  description: "Lấy báo cáo doanh thu và tình trạng ghế của một sự kiện dựa trên ID",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      eventId: {
        type: SchemaType.STRING,
        description: "ID (UUID) của sự kiện cần kiểm tra",
      },
    },
    required: ["eventId"],
  },
};


const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  tools: [{ functionDeclarations: [createEventTool as any, getStatsTool as any] }],
  systemInstruction: `Hôm nay là ngày ${new Date().toLocaleDateString('vi-VN')}. 
    Mọi sự kiện phải được lên lịch vào tương lai (năm 2026 trở đi). 
    Luôn ưu tiên phản hồi bằng tiếng Việt.`
});

const chat = model.startChat();

async function runAI(userInput: string) {
  console.log(` Người dùng: ${userInput}`);
  
  const result = await chat.sendMessage(userInput);
  const call = result.response.functionCalls()?.[0];

  // Nếu AI quyết định gọi hàm create_event
  if (call && call.name === "create_event") {
    const { title, start_time } = call.args as any;
    
    console.log(` AI đang gọi hàm: create_event("${title}", "${start_time}")`);

    try {
      const response = await axios.post("http://localhost:3000/api/events", {
        title,
        start_time
      });

      if (response.data.success) {
        const msg = ` Đã tạo thành công show "${title}"! ID sự kiện: ${response.data.data.id}. Hệ thống đang tự động xếp ghế chạy ngầm.`;
        console.log(msg);
      }
    } catch (error: any) {
      console.error(" Lỗi Backend:", error.response?.data?.error?.message || error.message);
    }
  } 
  else if (call && call.name === "get_event_stats") {
    const { eventId } = call.args as any;
    console.log(` AI đang gọi hàm: get_event_stats("${eventId}")`);
    try {
      const response = await axios.get(`http://localhost:3000/api/events/${eventId}/stats`);

      if (response.data.success) {
        const { soldCount, availableCount, totalRevenue } = response.data.data;
        const msg = ` Báo cáo sự kiện ${eventId}:
                    - Số ghế đã bán: ${soldCount}
                    - Số ghế còn lại: ${availableCount}
                    - Doanh thu tổng cộng: ${totalRevenue}`;
        console.log(msg);
      }
    } catch (error: any) {
      console.error(" Lỗi Backend:", error.response?.data?.error?.message || error.message);
    }
  }
  else {
    console.log(` AI phản hồi: ${result.response.text()}`);
  }
}


runAI("Hãy tạo cho tôi một đêm nhạc Trịnh Công Sơn vào tối thứ 6 tuần sau. Sau đó, hãy kiểm tra luôn thống kê của show diễn đó xem có ghế nào được bán chưa nhé.");