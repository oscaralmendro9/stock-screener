import { AssistantChatProvider } from '../contexts/AssistantChatContext';
import AssistantChat from '../components/AssistantChat/AssistantChat';

function ChatbotPage() {
  return (
    <AssistantChatProvider>
      <div className="tw h-full py-2">
        <AssistantChat mode="page" />
      </div>
    </AssistantChatProvider>
  );
}

export default ChatbotPage;
