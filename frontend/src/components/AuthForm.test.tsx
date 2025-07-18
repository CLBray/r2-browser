import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthForm } from './AuthForm';
import { useAuth } from '../hooks/useAuth';
import { ErrorHandler } from '../utils/error-handler';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock the useAuth hook
vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn()
}));

// Mock the ErrorHandler
vi.mock('../utils/error-handler', () => ({
  ErrorHandler: {
    parseApiError: vi.fn(),
    getUserFriendlyMessage: vi.fn(),
    logError: vi.fn()
  }
}));

describe('AuthForm', () => {
  const mockLogin = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementation
    (useAuth as any).mockReturnValue({
      login: mockLogin,
      isLoading: false
    });
    
    (ErrorHandler.parseApiError as any).mockImplementation((err: unknown) => err);
    (ErrorHandler.getUserFriendlyMessage as any).mockImplementation(() => 'Error message');
  });
  
  it('renders the form correctly', () => {
    render(<AuthForm />);
    
    expect(screen.getByText('Connect to your R2 Bucket')).toBeInTheDocument();
    expect(screen.getByLabelText(/Account ID/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Access Key ID/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Secret Access Key/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Bucket Name/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Connect to R2/i })).toBeInTheDocument();
  });
  
  it('updates form values when inputs change', () => {
    render(<AuthForm />);
    
    const accountIdInput = screen.getByLabelText(/Account ID/i);
    const accessKeyInput = screen.getByLabelText(/Access Key ID/i);
    const secretKeyInput = screen.getByLabelText(/Secret Access Key/i);
    const bucketNameInput = screen.getByLabelText(/Bucket Name/i);
    
    fireEvent.change(accountIdInput, { target: { value: 'a1b2c3d4e5f678901234567890123456' } });
    fireEvent.change(accessKeyInput, { target: { value: '12345678901234567890' } });
    fireEvent.change(secretKeyInput, { target: { value: '1234567890123456789012345678901234567890' } });
    fireEvent.change(bucketNameInput, { target: { value: 'test-bucket' } });
    
    expect(accountIdInput).toHaveValue('a1b2c3d4e5f678901234567890123456');
    expect(accessKeyInput).toHaveValue('12345678901234567890');
    expect(secretKeyInput).toHaveValue('1234567890123456789012345678901234567890');
    expect(bucketNameInput).toHaveValue('test-bucket');
  });
  
  it('validates credentials before submission', async () => {
    render(<AuthForm />);
    
    // Fill form with invalid data
    fireEvent.change(screen.getByLabelText(/Account ID/i), { target: { value: 'invalid' } });
    fireEvent.change(screen.getByLabelText(/Access Key ID/i), { target: { value: 'short' } });
    fireEvent.change(screen.getByLabelText(/Secret Access Key/i), { target: { value: 'short' } });
    fireEvent.change(screen.getByLabelText(/Bucket Name/i), { target: { value: 'A' } });
    
    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /Connect to R2/i }));
    
    // Check validation errors
    expect(await screen.findByText(/Account ID should be a 32 character hexadecimal string/i)).toBeInTheDocument();
    expect(await screen.findByText(/Access Key ID should be 20 characters long/i)).toBeInTheDocument();
    expect(await screen.findByText(/Secret Access Key should be 40 characters long/i)).toBeInTheDocument();
    expect(await screen.findByText(/Bucket name must be 3-63 characters/i)).toBeInTheDocument();
    
    // Login should not be called
    expect(mockLogin).not.toHaveBeenCalled();
  });
  
  it('submits the form with valid credentials', async () => {
    render(<AuthForm />);
    
    // Fill form with valid data
    fireEvent.change(screen.getByLabelText(/Account ID/i), { target: { value: 'a1b2c3d4e5f678901234567890123456' } });
    fireEvent.change(screen.getByLabelText(/Access Key ID/i), { target: { value: '12345678901234567890' } });
    fireEvent.change(screen.getByLabelText(/Secret Access Key/i), { target: { value: '1234567890123456789012345678901234567890' } });
    fireEvent.change(screen.getByLabelText(/Bucket Name/i), { target: { value: 'test-bucket' } });
    
    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /Connect to R2/i }));
    
    // Login should be called with correct credentials
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        accountId: 'a1b2c3d4e5f678901234567890123456',
        accessKeyId: '12345678901234567890',
        secretAccessKey: '1234567890123456789012345678901234567890',
        bucketName: 'test-bucket'
      });
    });
  });
  
  it('shows loading state during login', async () => {
    // Mock loading state
    (useAuth as any).mockReturnValue({
      login: vi.fn(() => new Promise(resolve => setTimeout(resolve, 100))),
      isLoading: true
    });
    
    render(<AuthForm />);
    
    // Verify loading state is shown
    expect(screen.getByText(/Connecting.../i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Connecting.../i })).toBeDisabled();
  });
  
  it('handles login errors', async () => {
    // Mock login to throw error
    const mockError = { error: 'Invalid credentials' };
    mockLogin.mockRejectedValue(mockError);
    (ErrorHandler.getUserFriendlyMessage as any).mockReturnValue('Invalid credentials. Please check your Account ID, Access Key, and Secret Key.');
    
    render(<AuthForm />);
    
    // Fill form with valid data
    fireEvent.change(screen.getByLabelText(/Account ID/i), { target: { value: 'a1b2c3d4e5f678901234567890123456' } });
    fireEvent.change(screen.getByLabelText(/Access Key ID/i), { target: { value: '12345678901234567890' } });
    fireEvent.change(screen.getByLabelText(/Secret Access Key/i), { target: { value: '1234567890123456789012345678901234567890' } });
    fireEvent.change(screen.getByLabelText(/Bucket Name/i), { target: { value: 'test-bucket' } });
    
    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /Connect to R2/i }));
    
    // Error should be displayed
    await waitFor(() => {
      expect(screen.getByText('Authentication Error')).toBeInTheDocument();
      expect(screen.getByText('Invalid credentials. Please check your Account ID, Access Key, and Secret Key.')).toBeInTheDocument();
    });
    
    // Error handler should be called
    expect(ErrorHandler.parseApiError).toHaveBeenCalledWith(mockError);
    expect(ErrorHandler.getUserFriendlyMessage).toHaveBeenCalled();
    expect(ErrorHandler.logError).toHaveBeenCalled();
  });
  
  it('toggles password visibility', () => {
    render(<AuthForm />);
    
    const secretKeyInput = screen.getByLabelText(/Secret Access Key/i);
    expect(secretKeyInput).toHaveAttribute('type', 'password');
    
    // Click the toggle button
    fireEvent.click(screen.getByRole('button', { name: '' }));
    
    // Input should now be text type
    expect(secretKeyInput).toHaveAttribute('type', 'text');
    
    // Click again to toggle back
    fireEvent.click(screen.getByRole('button', { name: '' }));
    
    // Input should be password type again
    expect(secretKeyInput).toHaveAttribute('type', 'password');
  });
});