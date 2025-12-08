import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdminDashboard from '../page';

// Mock alert
global.alert = jest.fn();

describe('AdminDashboard', () => {
    it('renders login screen initially', () => {
        render(<AdminDashboard />);
        expect(screen.getByText('Admin Login')).toBeInTheDocument();
        expect(screen.queryByText('Hal App Admin')).not.toBeInTheDocument();
    });

    it('logs in with correct password', () => {
        render(<AdminDashboard />);

        fireEvent.change(screen.getByPlaceholderText('Enter password'), { target: { value: 'admin123' } });
        fireEvent.click(screen.getByText('Login'));

        expect(screen.getByText('Hal App Admin')).toBeInTheDocument();
    });

    it('displays error with incorrect password', () => {
        render(<AdminDashboard />);

        fireEvent.change(screen.getByPlaceholderText('Enter password'), { target: { value: 'wrong' } });
        fireEvent.click(screen.getByText('Login'));

        expect(global.alert).toHaveBeenCalledWith('Invalid password');
    });

    it('sends broadcast message', () => {
        render(<AdminDashboard />);
        // Login
        fireEvent.change(screen.getByPlaceholderText('Enter password'), { target: { value: 'admin123' } });
        fireEvent.click(screen.getByText('Login'));

        // Send
        const input = screen.getByPlaceholderText('Message to all users...');
        fireEvent.change(input, { target: { value: 'Hello World' } });
        fireEvent.click(screen.getByText('SEND'));

        expect(screen.getByText(/BROADCASING: "Hello World"/)).toBeInTheDocument();
    });
});
