import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Toolbar } from './Toolbar';
import { describe, it, expect, vi } from 'vitest';

describe('Toolbar', () => {
  const defaultProps = {
    currentPath: 'test/path',
    onNavigateBack: vi.fn(),
    onNavigateUp: vi.fn(),
    onRefresh: vi.fn(),
    onCreateFolder: vi.fn(),
    onUpload: vi.fn(),
    onViewModeChange: vi.fn(),
    viewMode: 'grid' as const,
    isLoading: false
  };

  it('renders correctly', () => {
    render(<Toolbar {...defaultProps} />);
    
    // Check if navigation buttons are present
    expect(screen.getByTitle('Back')).toBeInTheDocument();
    expect(screen.getByTitle('Up to parent folder')).toBeInTheDocument();
    expect(screen.getByTitle('Refresh')).toBeInTheDocument();
    
    // Check if action buttons are present
    expect(screen.getByTitle('Create new folder')).toBeInTheDocument();
    expect(screen.getByTitle('Upload files')).toBeInTheDocument();
    
    // Check if view mode toggles are present
    expect(screen.getByTitle('Grid view')).toBeInTheDocument();
    expect(screen.getByTitle('List view')).toBeInTheDocument();
  });

  it('calls onNavigateBack when back button is clicked', () => {
    render(<Toolbar {...defaultProps} />);
    fireEvent.click(screen.getByTitle('Back'));
    expect(defaultProps.onNavigateBack).toHaveBeenCalledTimes(1);
  });

  it('calls onNavigateUp when up button is clicked', () => {
    render(<Toolbar {...defaultProps} />);
    fireEvent.click(screen.getByTitle('Up to parent folder'));
    expect(defaultProps.onNavigateUp).toHaveBeenCalledTimes(1);
  });

  it('calls onRefresh when refresh button is clicked', () => {
    render(<Toolbar {...defaultProps} />);
    fireEvent.click(screen.getByTitle('Refresh'));
    expect(defaultProps.onRefresh).toHaveBeenCalledTimes(1);
  });

  it('calls onCreateFolder when create folder button is clicked', () => {
    render(<Toolbar {...defaultProps} />);
    fireEvent.click(screen.getByTitle('Create new folder'));
    expect(defaultProps.onCreateFolder).toHaveBeenCalledTimes(1);
  });

  it('calls onUpload when upload button is clicked', () => {
    render(<Toolbar {...defaultProps} />);
    fireEvent.click(screen.getByTitle('Upload files'));
    expect(defaultProps.onUpload).toHaveBeenCalledTimes(1);
  });

  it('calls onViewModeChange with "grid" when grid view button is clicked', () => {
    render(<Toolbar {...defaultProps} viewMode="list" />);
    fireEvent.click(screen.getByTitle('Grid view'));
    expect(defaultProps.onViewModeChange).toHaveBeenCalledWith('grid');
  });

  it('calls onViewModeChange with "list" when list view button is clicked', () => {
    render(<Toolbar {...defaultProps} />);
    fireEvent.click(screen.getByTitle('List view'));
    expect(defaultProps.onViewModeChange).toHaveBeenCalledWith('list');
  });

  it('disables buttons when isLoading is true', () => {
    render(<Toolbar {...defaultProps} isLoading={true} />);
    
    expect(screen.getByTitle('Back')).toBeDisabled();
    expect(screen.getByTitle('Up to parent folder')).toBeDisabled();
    expect(screen.getByTitle('Refresh')).toBeDisabled();
    expect(screen.getByTitle('Create new folder')).toBeDisabled();
    expect(screen.getByTitle('Upload files')).toBeDisabled();
    expect(screen.getByTitle('Grid view')).toBeDisabled();
    expect(screen.getByTitle('List view')).toBeDisabled();
  });

  it('disables up button when at root path', () => {
    render(<Toolbar {...defaultProps} currentPath="" />);
    expect(screen.getByTitle('Up to parent folder')).toBeDisabled();
  });
});