import axios from "axios";


interface OllamaMessage {
  role: "user" | "assistant";
  content: string;
}

const conversationHistory: OllamaMessage[] = [];
const OLLAMA_URL = "http://localhost:11434/api/chat";

async function callOllama(userMessage: string): Promise<string> {
  conversationHistory.push({
    role: "user",
    content: userMessage
  });

  try {
    const response = await axios.post(OLLAMA_URL, {
      model: "mistral",
      messages: conversationHistory,
      stream: false
    });

    const assistantMessage = response.data.message.content;
    conversationHistory.push({
      role: "assistant",
      content: assistantMessage
    });

    return assistantMessage;
  } catch (error) {
    console.error(" Lỗi gọi Ollama:", error instanceof Error ? error.message : error);
    throw error;
  }
}

async function parseAndExecute(aiResponse: string) {
  console.log(`\n AI: ${aiResponse}\n`);

  // Kiểm tra xem AI có muốn tạo event không
  if (aiResponse.toLowerCase().includes("tạo") && aiResponse.toLowerCase().includes("sự kiện")) {

    const titleMatch = aiResponse.match(/["']([^"']+)["']/);
    const title = titleMatch ? titleMatch[1] : "Sự kiện từ Ollama";

    const nextFriday = new Date();
    nextFriday.setDate(nextFriday.getDate() + ((5 - nextFriday.getDay() + 7) % 7 || 7));
    nextFriday.setHours(19, 0, 0, 0);

    const payload = {
      title,
      start_time: nextFriday.toISOString()
    };

    try {
      console.log(`🎬 Tôi đang tạo sự kiện "${title}"...`);
      const response = await axios.post("http://localhost:3000/api/events", payload);

      if (response.data.success) {
        const eventId = response.data.data.id;
        console.log(`✅ ${response.data.message}`);
        console.log(`🎫 Event ID: ${eventId}`);

        // Kiểm tra stats
        const statsResponse = await axios.get(`http://localhost:3000/api/events/${eventId}/stats`);
        if (statsResponse.data.success) {
          const stats = statsResponse.data.data;
          console.log(`\n Thống kê sự kiện:`);
          console.log(`   - Ghế đã bán: ${stats.soldCount}`);
          console.log(`   - Ghế còn lại: ${stats.availableCount}`);
          console.log(`   - Doanh thu: ${stats.totalRevenue.toLocaleString('vi-VN')} VND`);
        }
      }
    } catch (error: any) {
      console.error(" Backend error:", error.response?.data?.error?.message || error.message);
    }
  }
}

async function main() {
  console.log(" Event Agent with Ollama (Local AI)\n");
  console.log(" Hướng dẫn:");
  console.log("   - Hãy yêu cầu tạo sự kiện bằng tiếng Việt");
  console.log("   - AI sẽ phân tích và tạo sự kiện tự động\n");

  const userInput = "Hãy tạo cho tôi một đêm nhạc Trịnh Công Sơn vào tối thứ 6 tuần sau. Sau đó, hãy kiểm tra luôn thống kê của show diễn đó xem có ghế nào được bán chưa nhé.";

  console.log(`👤 Bạn: ${userInput}\n`);

  try {
    // Gọi AI lần 1: Tạo sự kiện
    const response1 = await callOllama(userInput);
    await parseAndExecute(response1);

    // Gọi AI lần 2: Kiểm tra thống kê (nếu cần)
    console.log("\n Đang xử lý yêu cầu kiểm tra thống kê...");
    const response2 = await callOllama("Vừa tạo xong sự kiện, hãy kiểm tra thống kê.");
    console.log(`\n AI: ${response2}`);

  } catch (error) {
    console.error(" Lỗi chính:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Chạy
main();
