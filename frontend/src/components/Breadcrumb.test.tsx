import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Breadcrumb } from './Breadcrumb';
import { describe, it, expect, vi } from 'vitest';

describe('Breadcrumb', () => {
  const defaultProps = {
    path: 'folder1/folder2/folder3',
    onNavigate: vi.fn(),
    isLoading: false
  };

  it('renders correctly with path segments', () => {
    render(<Breadcrumb {...defaultProps} />);
    
    // Check if all path segments are rendered
    expect(screen.getByText('folder1')).toBeInTheDocument();
    expect(screen.getByText('folder2')).toBeInTheDocument();
    expect(screen.getByText('folder3')).toBeInTheDocument();
    
    // Home icon should be present
    const homeButton = screen.getAllByRole('button')[0];
    expect(homeButton).toBeInTheDocument();
    expect(homeButton.querySelector('svg')).toBeInTheDocument();
  });

  it('renders only Home when path is empty', () => {
    render(<Breadcrumb {...defaultProps} path="" />);
    
    // Home icon should be present
    const homeButton = screen.getByRole('button');
    expect(homeButton).toBeInTheDocument();
    expect(homeButton.querySelector('svg')).toBeInTheDocument();
    
    // No other segments should be present
    expect(screen.queryByText('folder1')).not.toBeInTheDocument();
  });

  it('calls onNavigate with correct path when segment is clicked', () => {
    render(<Breadcrumb {...defaultProps} />);
    
    // Click on the first folder
    fireEvent.click(screen.getByText('folder1'));
    expect(defaultProps.onNavigate).toHaveBeenCalledWith('folder1');
    
    // Click on the second folder
    fireEvent.click(screen.getByText('folder2'));
    expect(defaultProps.onNavigate).toHaveBeenCalledWith('folder1/folder2');
  });

  it('calls onNavigate with empty string when Home is clicked', () => {
    render(<Breadcrumb {...defaultProps} />);
    
    // Click on Home (first button)
    const homeButton = screen.getAllByRole('button')[0];
    fireEvent.click(homeButton);
    expect(defaultProps.onNavigate).toHaveBeenCalledWith('');
  });

  it('disables all buttons when isLoading is true', () => {
    render(<Breadcrumb {...defaultProps} isLoading={true} />);
    
    // All buttons should be disabled
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });

  it('disables the current (last) segment', () => {
    render(<Breadcrumb {...defaultProps} />);
    
    // Get all buttons
    const buttons = screen.getAllByRole('button');
    
    // The last segment should be disabled (current location)
    expect(buttons[buttons.length - 1]).toBeDisabled();
    
    // Other segments should be enabled
    for (let i = 0; i < buttons.length - 1; i++) {
      expect(buttons[i]).not.toBeDisabled();
    }
  });
});